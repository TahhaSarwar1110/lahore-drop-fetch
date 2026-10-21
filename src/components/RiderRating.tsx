import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type RiderRatingSummary = { avg_rating: number; review_count: number };

export const fetchRiderRatings = async (riderIds: string[]) => {
  const map = new Map<string, RiderRatingSummary>();
  if (!riderIds.length) return map;
  const { data } = await supabase.rpc("get_rider_ratings", { p_rider_ids: riderIds });
  (data ?? []).forEach((r: { rider_id: string; avg_rating: number; review_count: number }) =>
    map.set(r.rider_id, { avg_rating: Number(r.avg_rating), review_count: r.review_count }));
  return map;
};

export const RiderRatingBadge = ({ summary, className }: { summary?: RiderRatingSummary; className?: string }) => (
  <span className={cn("inline-flex items-center gap-1 text-sm text-muted-foreground", className)}>
    <Star className="h-4 w-4 fill-accent text-accent" />
    {summary && summary.review_count > 0
      ? <><span className="font-semibold text-foreground">{summary.avg_rating.toFixed(1)}</span> / 5 ({summary.review_count})</>
      : "No ratings yet"}
  </span>
);

export const useRiderRating = (riderId?: string | null) => {
  const [summary, setSummary] = useState<RiderRatingSummary | undefined>();
  const reload = async () => {
    if (!riderId) return;
    const map = await fetchRiderRatings([riderId]);
    setSummary(map.get(riderId));
  };
  useEffect(() => { reload(); }, [riderId]);
  return { summary, reload };
};

export const RiderReviewForm = ({ orderId, onSaved }: { orderId: string; onSaved?: () => void }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [existing, setExisting] = useState(false);

  useEffect(() => {
    supabase.from("rider_reviews").select("rating, comment").eq("order_id", orderId).maybeSingle()
      .then(({ data }) => {
        if (data) { setRating(data.rating); setComment(data.comment ?? ""); setExisting(true); }
      });
  }, [orderId]);

  const save = async () => {
    const { error } = await supabase.rpc("submit_rider_review", { p_order_id: orderId, p_rating: rating, p_comment: comment });
    if (error) { toast.error(error.message); return; }
    setExisting(true);
    toast.success("Thanks for rating your rider!");
    onSaved?.();
  };

  return (
    <div className="mt-4 border-t pt-4 space-y-3">
      <p className="text-sm font-medium">{existing ? "Your rating" : "Rate your rider"}</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(rating === n ? n - 1 : n)} className="p-1">
            <Star className={cn("h-7 w-7", n <= rating ? "fill-accent text-accent" : "text-muted-foreground")} />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">{rating} / 5</span>
      </div>
      <Textarea placeholder="Share feedback about the rider (optional)" value={comment}
        onChange={e => setComment(e.target.value)} maxLength={500} />
      <Button size="sm" onClick={save}>{existing ? "Update Review" : "Submit Review"}</Button>
    </div>
  );
};
