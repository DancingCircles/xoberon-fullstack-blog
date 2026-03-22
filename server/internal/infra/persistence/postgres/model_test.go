package postgres

import (
	"testing"
)

func TestStringArray_Value_EscapesBackslash(t *testing.T) {
	arr := StringArray{`tag\with\backslash`, `normal`}
	val, err := arr.Value()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	s, ok := val.(string)
	if !ok {
		t.Fatalf("expected string, got %T", val)
	}
	expected := `{"tag\\with\\backslash","normal"}`
	if s != expected {
		t.Errorf("expected %q, got %q", expected, s)
	}
}

func TestStringArray_Value_EscapesQuotes(t *testing.T) {
	arr := StringArray{`tag"with"quotes`}
	val, err := arr.Value()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	s := val.(string)
	expected := `{"tag\"with\"quotes"}`
	if s != expected {
		t.Errorf("expected %q, got %q", expected, s)
	}
}

func TestStringArray_Value_Empty(t *testing.T) {
	arr := StringArray{}
	val, err := arr.Value()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if val != "{}" {
		t.Errorf("empty array should produce '{}', got %q", val)
	}
}

func TestStringArray_Scan(t *testing.T) {
	tests := []struct {
		input    string
		expected []string
	}{
		{"{}", nil},
		{`{go,rust}`, []string{"go", "rust"}},
		{`{"hello world","test"}`, []string{"hello world", "test"}},
	}

	for _, tt := range tests {
		var arr StringArray
		if err := arr.Scan(tt.input); err != nil {
			t.Errorf("scan %q failed: %v", tt.input, err)
			continue
		}
		if tt.expected == nil {
			if len(arr) != 0 {
				t.Errorf("scan %q: expected empty, got %v", tt.input, arr)
			}
			continue
		}
		if len(arr) != len(tt.expected) {
			t.Errorf("scan %q: length mismatch %d vs %d", tt.input, len(arr), len(tt.expected))
			continue
		}
		for i := range arr {
			if arr[i] != tt.expected[i] {
				t.Errorf("scan %q: [%d] expected %q, got %q", tt.input, i, tt.expected[i], arr[i])
			}
		}
	}
}
