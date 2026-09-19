import { useState, useEffect } from "react";
import { Star, Trash2, Pencil, CheckCircle } from "lucide-react";
import { MAROON, GOLD, SERIF } from "@nakshra/shared-config/theme";
import { useAuth } from "@nakshra/shared-auth";
import { useReviews, timeAgo } from "@nakshra/shared-hooks/useReviews";


const CARD = { background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.07)" };

/** Read-only row of stars. */
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={size} fill={i < Math.round(value) ? GOLD : "none"} stroke={GOLD} strokeWidth={1.5} />
      ))}
    </div>
  );
}

/** The star picker in the form — keyboard reachable, not just hoverable. */
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"];
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            aria-pressed={value === n}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => onChange(n)}
            className="p-0.5 rounded transition-transform hover:scale-110 active:scale-95"
          >
            <Star size={26} fill={n <= shown ? GOLD : "none"} stroke={GOLD} strokeWidth={1.5} />
          </button>
        ))}
      </div>
      <span className="text-xs font-semibold" style={{ color: shown ? MAROON : "#9A8A78" }}>
        {shown ? LABELS[shown - 1] : "Tap a star"}
      </span>
    </div>
  );
}

/** `state` comes from useReviews() in the page, which also feeds the header stars. */
export function ProductReviews({ state }: { state: ReturnType<typeof useReviews> }) {
  const { isLoggedIn, openAuth } = useAuth();
  const { reviews, summary, myReview, loading, saving, error, submit, remove } = state;

  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);

  // Opening the form on a product you already rated edits that review.
  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setTitle(myReview.title);
      setBody(myReview.body);
      setName(myReview.name);
    }
  }, [myReview?.id]);

  const startWriting = () => {
    if (!isLoggedIn) {
      openAuth();
      return;
    }
    setThanks(false);
    setFormError(null);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      setFormError("Please choose a star rating.");
      return;
    }
    const res = await submit({ rating, title, body, name });
    if (res.ok) {
      setOpen(false);
      setThanks(true);
      setFormError(null);
    } else {
      setFormError(res.error || "Could not post your review.");
    }
  };

  const handleDelete = async () => {
    const res = await remove();
    if (res.ok) {
      setOpen(false);
      setThanks(false);
      setRating(0);
      setTitle("");
      setBody("");
    } else {
      setFormError(res.error || "Could not remove your review.");
    }
  };

  const inputStyle = {
    background: "#FAF7F2",
    border: "1px solid rgba(91,31,36,0.14)",
    color: "#3A2A1A",
  };

  return (
    <div className="space-y-4 max-w-4xl">
      {/* ---- Summary ---- */}
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-5 p-5 rounded-2xl"
        style={{ background: "rgba(200,160,68,0.06)", border: "1px solid rgba(200,160,68,0.15)" }}
      >
        <div className="text-center sm:w-32 flex-shrink-0">
          <div className="text-4xl font-semibold" style={{ fontFamily: SERIF, color: MAROON }}>
            {summary.count ? summary.average.toFixed(1) : "—"}
          </div>
          <div className="flex justify-center mt-1">
            <Stars value={summary.average} />
          </div>
          <div className="text-xs mt-1" style={{ color: "#7A6A58" }}>
            {summary.count === 0
              ? "No ratings yet"
              : `${summary.count} ${summary.count === 1 ? "rating" : "ratings"}`}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {[5, 4, 3, 2, 1].map(n => {
            const count = summary.histogram[n - 1];
            const pct = summary.count ? (count / summary.count) * 100 : 0;
            return (
              <div key={n} className="flex items-center gap-2 mb-1">
                <span className="text-xs w-3" style={{ color: "#9A8A78" }}>{n}</span>
                <Star size={10} fill={GOLD} stroke={GOLD} />
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(91,31,36,0.08)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: GOLD }} />
                </div>
                <span className="text-[10px] w-5 text-right" style={{ color: "#9A8A78" }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- Write / edit ---- */}
      {thanks && !open && (
        <div
          className="flex items-center gap-2 p-3 rounded-xl text-sm"
          style={{ background: "rgba(46,125,50,0.08)", border: "1px solid rgba(46,125,50,0.2)", color: "#2E7D32" }}
        >
          <CheckCircle size={16} /> Thank you — your review is live.
        </div>
      )}

      {!open && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={startWriting}
            className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:brightness-110 active:scale-95"
            style={{ background: MAROON, color: GOLD }}
          >
            {myReview ? "Edit your review" : "Write a review"}
          </button>
          {!isLoggedIn && (
            <span className="text-xs" style={{ color: "#7A6A58" }}>
              Sign in to rate this product.
            </span>
          )}
          {myReview && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-colors hover:bg-black/5 disabled:opacity-50"
              style={{ color: "#A03A3A", border: "1px solid rgba(160,58,58,0.25)" }}
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="p-5 rounded-2xl space-y-4" style={CARD}>
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: MAROON }}>
              Your rating <span style={{ color: "#A03A3A" }}>*</span>
            </label>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          <div>
            <label htmlFor="review-title" className="block text-xs font-semibold mb-1.5" style={{ color: MAROON }}>
              Headline
            </label>
            <input
              id="review-title"
              value={title}
              maxLength={120}
              onChange={e => setTitle(e.target.value)}
              placeholder="Sum it up in a few words"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none focus:ring-2"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="review-body" className="block text-xs font-semibold mb-1.5" style={{ color: MAROON }}>
              Your review
            </label>
            <textarea
              id="review-body"
              value={body}
              rows={4}
              maxLength={2000}
              onChange={e => setBody(e.target.value)}
              placeholder="How is the quality, the finish, the delivery? What would you tell another buyer?"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none focus:ring-2 resize-y"
              style={inputStyle}
            />
            <div className="text-[10px] mt-1 text-right" style={{ color: "#9A8A78" }}>{body.length}/2000</div>
          </div>

          <div>
            <label htmlFor="review-name" className="block text-xs font-semibold mb-1.5" style={{ color: MAROON }}>
              Name shown with your review
            </label>
            <input
              id="review-name"
              value={name}
              maxLength={40}
              onChange={e => setName(e.target.value)}
              placeholder="Leave blank to show your first name and an initial"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none focus:ring-2"
              style={inputStyle}
            />
          </div>

          {formError && (
            <p className="text-xs" style={{ color: "#A03A3A" }}>{formError}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
              style={{ background: MAROON, color: GOLD }}
            >
              {saving ? "Posting…" : myReview ? "Update review" : "Post review"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setFormError(null); }}
              className="px-4 py-2.5 rounded-full text-sm font-semibold transition-colors hover:bg-black/5"
              style={{ color: "#7A6A58" }}
            >
              Cancel
            </button>
          </div>
          <p className="text-[10px] leading-relaxed" style={{ color: "#9A8A78" }}>
            Your review appears on this listing and on every option of it. Only reviews from accounts
            with a paid order for the item carry the Verified Purchase mark.
          </p>
        </form>
      )}

      {/* ---- The reviews ---- */}
      {loading && reviews.length === 0 && (
        <p className="text-sm" style={{ color: "#7A6A58" }}>Loading reviews…</p>
      )}

      {error && reviews.length === 0 && !loading && (
        <p className="text-sm" style={{ color: "#A03A3A" }}>Reviews could not be loaded right now.</p>
      )}

      {!loading && !error && reviews.length === 0 && (
        <div className="p-6 rounded-2xl text-center" style={CARD}>
          <p className="text-sm font-semibold mb-1" style={{ fontFamily: SERIF, color: MAROON }}>
            No reviews yet
          </p>
          <p className="text-xs" style={{ color: "#7A6A58" }}>
            Be the first to rate this — your words help the next devotee choose.
          </p>
        </div>
      )}

      {reviews.map(r => (
        <div key={r.id} className="p-5 rounded-2xl" style={CARD}>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                style={{ background: MAROON, color: GOLD }}
              >
                {r.name.trim().charAt(0).toUpperCase() || "N"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: MAROON }}>
                  {r.name}
                  {myReview?.id === r.id && <span style={{ color: "#9A8A78" }}> · your review</span>}
                </div>
                {r.verified && (
                  <div className="text-[10px]" style={{ color: "#4A8A4A" }}>✓ Verified Purchase</div>
                )}
              </div>
            </div>
            <span className="text-[10px] flex-shrink-0" style={{ color: "#9A8A78" }}>{timeAgo(r.createdAt)}</span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <Stars value={r.rating} size={11} />
            {r.title && (
              <span className="text-xs font-semibold truncate" style={{ color: MAROON }}>{r.title}</span>
            )}
          </div>

          {r.body && (
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "#5A4A3A" }}>{r.body}</p>
          )}

          {myReview?.id === r.id && !open && (
            <button
              type="button"
              onClick={startWriting}
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: MAROON }}
            >
              <Pencil size={12} /> Edit
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
