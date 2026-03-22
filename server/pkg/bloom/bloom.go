package bloom

import (
	"sync"

	bloomfilter "github.com/bits-and-blooms/bloom/v3"
)

// SlugFilter wraps a Bloom filter to provide thread-safe
// probabilistic membership testing for post slugs.
type SlugFilter struct {
	mu            sync.RWMutex
	filter        *bloomfilter.BloomFilter
	estimatedItems uint
	fpRate        float64
}

// New creates a SlugFilter with the given capacity and false-positive rate.
// Typical usage: New(100_000, 0.0001) for 100k items with 0.01% FP rate.
func New(estimatedItems uint, fpRate float64) *SlugFilter {
	return &SlugFilter{
		filter:        bloomfilter.NewWithEstimates(estimatedItems, fpRate),
		estimatedItems: estimatedItems,
		fpRate:        fpRate,
	}
}

// Add inserts a slug into the filter. Safe for concurrent use.
func (f *SlugFilter) Add(slug string) {
	f.mu.Lock()
	f.filter.AddString(slug)
	f.mu.Unlock()
}

// MightExist returns true if the slug *might* be in the set.
// False means the slug is definitely NOT in the set (no false negatives).
func (f *SlugFilter) MightExist(slug string) bool {
	f.mu.RLock()
	exists := f.filter.TestString(slug)
	f.mu.RUnlock()
	return exists
}

// Rebuild replaces the internal filter with a fresh one built from
// the provided slug list. Used at startup and after deletions.
func (f *SlugFilter) Rebuild(slugs []string) {
	fresh := bloomfilter.NewWithEstimates(f.estimatedItems, f.fpRate)
	for _, s := range slugs {
		fresh.AddString(s)
	}
	f.mu.Lock()
	f.filter = fresh
	f.mu.Unlock()
}
