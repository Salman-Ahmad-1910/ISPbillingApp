package middleware

import (
	"net/http/httptest"
	"testing"

	"awesomeProject/models"

	"github.com/gin-gonic/gin"
)

// The mobile app follows the "App/Mobile" switch, browsers follow "Web".
func TestPermissionEnabledByPlatform(t *testing.T) {
	webOnly := models.UserPermission{WebEnabled: true, MobileEnabled: false}
	mobileOnly := models.UserPermission{WebEnabled: false, MobileEnabled: true}
	both := models.UserPermission{WebEnabled: true, MobileEnabled: true}
	neither := models.UserPermission{}

	cases := []struct {
		name     string
		perm     models.UserPermission
		platform string
		want     bool
	}{
		{"web granted, web request", webOnly, platformWeb, true},
		{"web granted, mobile request", webOnly, platformMobile, false},
		{"mobile granted, mobile request", mobileOnly, platformMobile, true},
		{"mobile granted, web request", mobileOnly, platformWeb, false},
		{"both granted, web request", both, platformWeb, true},
		{"both granted, mobile request", both, platformMobile, true},
		{"nothing granted, web request", neither, platformWeb, false},
		{"nothing granted, mobile request", neither, platformMobile, false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := permissionEnabled(tc.perm, tc.platform); got != tc.want {
				t.Fatalf("permissionEnabled() = %v, want %v", got, tc.want)
			}
		})
	}
}

// An absent or unrecognised header must keep the existing web behaviour.
func TestRequestPlatform(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cases := []struct {
		header string
		want   string
	}{
		{"", platformWeb},
		{"web", platformWeb},
		{"mobile", platformMobile},
		{"MOBILE", platformMobile},
		{" mobile ", platformMobile},
	}

	for _, tc := range cases {
		t.Run(tc.header, func(t *testing.T) {
			ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
			ctx.Request = httptest.NewRequest("GET", "/", nil)
			if tc.header != "" {
				ctx.Request.Header.Set(ClientPlatformHeader, tc.header)
			}
			if got := requestPlatform(ctx); got != tc.want {
				t.Fatalf("requestPlatform() = %q, want %q", got, tc.want)
			}
		})
	}
}
