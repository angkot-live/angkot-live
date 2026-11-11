import assert from 'node:assert/strict'
import { test } from 'node:test'
import { simulationFrame } from '../src/features/tracking/simulator.ts'
const line=[[0,0],[0,0.01],[0,0.02]]
test('simulator advances by real elapsed time at a bounded speed',()=>{
 const a=simulationFrame(line,0,20,3000)
 assert.ok(Math.abs(a.offsetKm-20*3/3600)<1e-9)
 assert.ok(a.position[1]>0&&a.position[1]<0.01)
 assert.equal(a.heading,90)
 assert.equal(simulationFrame(line,a.offsetKm,0,3000).offsetKm,a.offsetKm)
 assert.equal(simulationFrame(line,0,1000,3000).speedKph,40)
})
test('simulator stops at the selected chain endpoint without looping or crossing a gap',()=>{
 const frame=simulationFrame(line,999,20,3000)
 assert.equal(frame.ended,true)
 assert.deepEqual(frame.position,line.at(-1))
 assert.equal(frame.speedKph,0)
 const separate=[[1,1],[1,1.01]]
 assert.deepEqual(simulationFrame(separate,999,20,3000).position,separate.at(-1))
})
