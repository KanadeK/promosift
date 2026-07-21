# Algorithms and limitations

PromoSift deliberately uses small, explainable browser-local heuristics rather than AI aesthetic scoring.

## dHash duplicates

Images are converted to a 9×8 grayscale sample. Adjacent pixels produce a 64-bit difference hash; Hamming distance compares hashes. This catches many similar frames cheaply, but overlays, crops, UI changes, pixel art, letterboxing, and motion can produce false positives or negatives. Exact files use SHA-256 instead.

## Blur-like signal

After downscaling the longest side to 512 pixels, the app computes variance of a grayscale discrete Laplacian response. Low response can mean blur, low-detail imagery, fog, gradients, or intentional pixel art. It is only comparable within a batch and never claims to measure optical focus.

## Exposure and blank frames

Mean luminance, luminance standard deviation, dark/highlight ratios, and RGB variation create review suggestions. Night scenes, deliberately high-key art, minimal scenes, loading frames, and UI captures may be correctly flagged.

## Diversity

Each image gets a 4×4×4 quantized RGB histogram. Euclidean distance between histograms provides a conservative “many selected screenshots look visually similar” prompt. Suggested shortlist greedily increases color distance after prioritizing basic specification status and fewer warning signals. It cannot understand content, characters, or composition.

## Why no AI aesthetics

Beauty and marketing context are creative decisions. PromoSift neither sends images to a model nor claims to select the best screenshots, improve sales, or predict conversion.
