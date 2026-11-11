package platform

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type User struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Email        string `json:"email"`
	Phone        string `json:"phone"`
	Role         string `json:"role"`
	Verification string `json:"driverVerification"`
}
type Client struct {
	URL, Key, Anon string
	HTTP           *http.Client
}

func New(base, key, anon string) *Client {
	return &Client{strings.TrimRight(base, "/"), key, anon, &http.Client{Timeout: 12 * time.Second}}
}
func (s *Client) Request(method, path, token string, body any, out any) error {
	var reader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(b)
	}
	return s.Send(method, path, token, reader, "application/json", out)
}
func (s *Client) Send(method, path, token string, body io.Reader, contentType string, out any) error {
	req, err := http.NewRequest(method, s.URL+path, body)
	if err != nil {
		return err
	}
	req.Header.Set("apikey", s.Key)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", contentType)
	res, err := s.HTTP.Do(req)
	if err != nil {
		return errors.New("Layanan data belum dapat dihubungi")
	}
	defer res.Body.Close()
	if res.StatusCode >= 400 {
		var v map[string]any
		_ = json.NewDecoder(io.LimitReader(res.Body, 65536)).Decode(&v)
		for _, k := range []string{"msg", "message", "error_description", "error"} {
			if msg, ok := v[k].(string); ok {
				return fmt.Errorf("%s", msg)
			}
		}
		return fmt.Errorf("Layanan data mengembalikan status %d", res.StatusCode)
	}
	if out != nil {
		return json.NewDecoder(io.LimitReader(res.Body, 16<<20)).Decode(out)
	}
	return nil
}
func (s *Client) Command(actor, action string, input any, out any) error {
	return s.Request("POST", "/rest/v1/rpc/flow_command", s.Key, map[string]any{"p_actor": actor, "p_action": action, "p_input": input}, out)
}
func (s *Client) User(token string) (User, error) {
	var auth struct {
		ID string `json:"id"`
	}
	if token == "" || len(token) > 10000 {
		return User{}, errors.New("Sesi login tidak valid")
	}
	if err := s.Request("GET", "/auth/v1/user", token, nil, &auth); err != nil {
		return User{}, errors.New("Sesi login kedaluwarsa. Silakan masuk lagi")
	}
	var user User
	err := s.Command(auth.ID, "me", map[string]any{}, &user)
	return user, err
}
func Escape(s string) string { return url.PathEscape(s) }
