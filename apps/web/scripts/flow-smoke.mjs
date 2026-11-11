// Browser integration fixture. No simulated positions are added to the operational app.
// Start Vite with VITE_SUPABASE_URL=http://127.0.0.1:9001 and VITE_SUPABASE_ANON_KEY=test-anon.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const origin=process.env.SMOKE_ORIGIN??'http://127.0.0.1:5173'
const {routes}=JSON.parse(await readFile(new URL('../src/data/angkot-routes.json',import.meta.url)))
const route=routes.find((r)=>r.id==='4650417')??routes[0],position=route.polyline[2]
const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
const context=await browser.newContext({viewport:{width:390,height:844},permissions:['geolocation'],geolocation:{latitude:position[0],longitude:position[1],accuracy:10}})
const page=await context.newPage(),errors=[],intervals=new Set()
page.setDefaultTimeout(15000)
page.on('pageerror',(e)=>errors.push(e.message))
const users={
 passenger:{id:'33333333-3333-4333-8333-333333333333',name:'Passenger Test',email:'passenger@test.local',phone:'081234567890',role:'penumpang'},
 driver:{id:'22222222-2222-4222-8222-222222222222',name:'Driver Test',email:'driver@test.local',phone:'081234567891',role:'pengemudi',driverVerification:'disetujui'},
 admin:{id:'11111111-1111-4111-8111-111111111111',name:'Admin Test',email:'admin@test.local',role:'admin'},
}
let user=users.passenger,request=null,trip=null,reports=[],mode='offline',session='',lastFix=null,snapshotsPaused=false
const vehicle=()=>({id:'44444444-4444-4444-8444-444444444444',plate:'D TEST 001',routeId:route.id,routeCode:route.code,routeName:route.name,driverName:'Driver Test',position,status:'jalan',speedKph:15,heading:0,lastSeenAt:Date.now(),driverVerified:true,chain:0,offsetKm:0.1,etaMinutes:null})
const authUser=()=>({id:user.id,aud:'authenticated',role:'authenticated',email:user.email,app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:new Date().toISOString()})
const token=()=>`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),role:'authenticated'})).toString('base64url')}.test-signature`
await page.route('http://127.0.0.1:9001/**',async(r)=>{if(r.request().method()==='OPTIONS'){await r.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});return};await r.fulfill({json:authUser(),headers:{'access-control-allow-origin':'*'}})})
await page.route('**/api/**',async(r)=>{
 const path=new URL(r.request().url()).pathname,method=r.request().method(),body=JSON.parse(r.request().postData()??'{}')
 let result={}
 if(path==='/api/auth/login'){user=Object.values(users).find((u)=>u.email===body.email)??users.passenger;result={access_token:token(),refresh_token:'test-refresh-token',expires_in:3600,token_type:'bearer',user:authUser()}}
 else if(path==='/api/routes')result=routes.map(r=>({...r,isActive:true}))
 else if(path==='/api/me')result=user
 else if(path==='/api/reports'&&method==='GET')result=reports
 else if(path==='/api/reports'&&method==='POST'){const report={...body,id:'report-one',code:'LPR-TEST',status:'diterima',created_at:new Date().toISOString(),plate_number:body.plate,evidence_urls:[],updates:[]};reports.push(report);result=report}
 else if(path==='/api/messages')result=[]
 else if(path==='/api/admin/drivers')result=[]
 else if(path==='/api/driver/assignment'||path==='/api/driver/onboarding')result={id:user.id,status:'disetujui',form:{},routeId:route.id,vehicleId:vehicle().id,vehicle:{id:vehicle().id,plate:vehicle().plate,capacity:12},documents:[]}
 else if(path==='/api/driver/duty'){mode=body.mode;session=body.session;result={mode,session,vehicle:vehicle(),distanceKm:0,prompt:null}}
 else if(path==='/api/passenger/trips'&&method==='GET')result=trip?.status==='completed'?[trip]:[]
 else if(path==='/api/passenger/requests'&&method==='POST'){request={id:'55555555-5555-4555-8555-555555555555',passenger_id:user.id,route_id:body.routeId,name:user.name,destination:'Tujuan test',position,pickup:position,status:'searching',matched_vehicle_id:null,created_at:new Date().toISOString(),expires_at:new Date(Date.now()+60000).toISOString(),last_seen_at:new Date().toISOString(),revision:1};result=request}
 else if(path==='/api/passenger/trips'&&method==='POST'){trip={id:'66666666-6666-4666-8666-666666666666',request_id:request.id,vehicle_id:vehicle().id,route_id:route.id,origin_name:'Titik naik',destination_name:'Tujuan test',started_at:new Date().toISOString(),finished_at:null,distance_km:0,start_offset_km:0.1,chain_index:0,fare:5000,status:'active'};request=null;result=trip}
 else if(path==='/api/passenger/trips/complete'){trip={...trip,status:'completed',finished_at:new Date().toISOString(),distance_km:1.2};result=trip;}
 else if(path==='/api/search/route')result=[{route}]
 await r.fulfill({json:result})
})
await page.routeWebSocket('**/api/ws',(ws)=>{
 let interval
 function snapshot(){if(snapshotsPaused)return;ws.send(JSON.stringify({type:'snapshot',data:{vehicles:[vehicle()],request:request,trip:trip?.status==='active'?trip:null,nearby:[],duty:{mode,session,vehicle:mode==='offline'?null:vehicle(),distanceKm:0,prompt:null},serverTime:Date.now()}}))}
 ws.onMessage((raw)=>{const data=JSON.parse(String(raw));if(data.type==='auth'){snapshot();interval=setInterval(snapshot,250);intervals.add(interval)}else if(data.type==='driver:position')lastFix=data})
 ws.onClose(()=>clearInterval(interval))
})
try{
 await page.goto(`${origin}/login`)
 await page.getByLabel('Email',{exact:true}).fill(users.passenger.email)
 await page.getByLabel('Password',{exact:true}).fill('Password123')
 await page.getByRole('button',{name:'Masuk',exact:true}).click()
 await page.waitForURL('**/penumpang')
 await page.getByLabel('Arah jurusan megat').selectOption(route.id)
 await page.getByRole('button',{name:'Megat Angkot',exact:true}).click()
 await page.getByRole('button',{name:`Saya naik ${vehicle().plate}`}).click()
 await page.waitForURL('**/penumpang/perjalanan')
 await page.getByRole('heading',{name:'Perjalanan aktif',exact:true}).waitFor()
 await page.reload()
 await page.getByRole('heading',{name:'Perjalanan aktif',exact:true}).waitFor()
 await page.getByRole('button',{name:'Saya sudah turun — selesai'}).click()
 await page.getByRole('heading',{name:'Perjalanan selesai',exact:true}).waitFor()
 await page.getByRole('link',{name:'Laporkan masalah'}).click()
 await page.locator('#report-description').fill('Pengemudi berhenti terlalu lama dan menghalangi jalan.')
 await page.getByRole('button',{name:/Kirim laporan/i}).click()
 await page.waitForURL('**/penumpang/laporan')
 assert.equal(reports.length,1)
 // Sign out locally before testing the independent driver account.
 await page.evaluate(()=>{localStorage.clear();sessionStorage.clear()})
 await page.goto(`${origin}/login`)
 await page.getByLabel('Email',{exact:true}).fill(users.driver.email)
 await page.getByLabel('Password',{exact:true}).fill('Password123')
 await page.getByRole('button',{name:'Masuk',exact:true}).click()
 await page.waitForURL('**/pengemudi')
 await page.getByRole('button',{name:'Narik',exact:true}).click()
 await page.waitForFunction(()=>document.body.textContent.includes('GPS aktif'))
 // Browser geolocation must produce an actual outgoing driver event in the integration fixture.
 for(let i=0;i<40&&!lastFix;i++)await new Promise((r)=>setTimeout(r,100))
 assert.ok(lastFix,'Driver did not publish GPS')
 await page.getByRole('button',{name:'Istirahat',exact:true}).click()
 assert.equal(mode,'istirahat')
 // Stop fixture snapshots so the reconnect simulation is not overwritten mid-assertion.
 snapshotsPaused=true
 await page.waitForTimeout(350)
 await page.evaluate(async()=>{const {useLiveStore}=await import('/src/features/tracking/live-store.ts'); useLiveStore.setState({connection:'disconnected'})})
 await page.getByText('Saat koneksi putus, sinyal penumpang belum dapat dikonfirmasi.', { exact: true }).waitFor()
 assert.deepEqual(errors,[])
 console.log('PASS browser: login, megat, boarding, reload active trip, complete, report, driver GPS, rest; no page errors')
}finally{for(const timer of intervals)clearInterval(timer);await browser.close()}
