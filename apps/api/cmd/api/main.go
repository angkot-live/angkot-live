package main

import (
	"angkot-live/api/internal/httpapi"
	"angkot-live/api/internal/platform"
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

func env(key, fallback string) string {
	if s := os.Getenv(key); s != "" {
		return s
	}
	return fallback
}
func listenAddr() string {
	if a := os.Getenv("API_ADDR"); a != "" {
		if !strings.HasPrefix(a, ":") && !strings.Contains(a, ":") {
			return ":" + a
		}
		return a
	}
	if p := os.Getenv("PORT"); p != "" {
		if !strings.HasPrefix(p, ":") {
			return ":" + p
		}
		return p
	}
	return ":8080"
}
func main() {
	importData := flag.Bool("import-routes", false, "Import canonical routes then exit")
	flag.Parse()
	for _, key := range []string{"SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY"} {
		if os.Getenv(key) == "" {
			log.Fatalf("%s wajib diisi (lihat .env.example)", key)
		}
	}
	db := platform.New(os.Getenv("SUPABASE_URL"), os.Getenv("SUPABASE_SERVICE_ROLE_KEY"), os.Getenv("SUPABASE_ANON_KEY"))
	dataPath := ""
	if *importData {
		dataPath = env("ROUTES_FILE", "../web/src/data/angkot-routes.json")
	}
	app, err := httpapi.New(db, dataPath, env("WEB_ORIGIN", "http://localhost:5173"))
	if err != nil {
		log.Fatal(err)
	}
	if *importData {
		if err := app.ImportRoutes(); err != nil {
			log.Fatal(err)
		}
		log.Printf("%d arah trayek diimpor", len(app.Routes))
		return
	}
	app.DatabaseRoutes = true
	if err := app.ReloadRoutes(); err != nil {
		log.Fatalf("Trayek database gagal dimuat: %v", err)
	}
	app.Origins = strings.Split(os.Getenv("WEB_ORIGINS"), ",")
	app.PublicSupabaseURL = os.Getenv("SUPABASE_PUBLIC_URL")
	app.DemoLogin = os.Getenv("ENABLE_DEMO_LOGIN") == "true"
	if err := db.Request("POST", "/rest/v1/rpc/reset_runtime_state", db.Key, map[string]any{}, nil); err != nil {
		log.Fatalf("Reset status tugas gagal: %v", err)
	}
	trackingContext, stopTracking := context.WithCancel(context.Background())
	defer stopTracking()
	go app.RunTracking(trackingContext)
	server := &http.Server{Addr: listenAddr(), Handler: app.Handler(), ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 60 * time.Second}
	go func() {
		log.Printf("API mendengarkan %s", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
}
