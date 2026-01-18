import { useState, useEffect } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Testimonial {
  id: number;
  name: string;
  location: string;
  rating: number;
  text: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Sarah Ahmed",
    location: "Dubai, UAE",
    rating: 5,
    text: "PickyRider helped me send gifts to my family in Lahore. The photo confirmation before purchase gave me complete peace of mind. Highly recommended!",
  },
  {
    id: 2,
    name: "Ahmed Khan",
    location: "London, UK",
    rating: 5,
    text: "I've used PickyRider multiple times for sending traditional clothes to my parents. Their service is reliable, fast, and the team is very responsive on WhatsApp.",
  },
  {
    id: 3,
    name: "Fatima Malik",
    location: "Toronto, Canada",
    rating: 5,
    text: "The best proxy shopping service in Pakistan! They shopped groceries for my grandmother and delivered the same day. Transparent pricing with no surprises.",
  },
  {
    id: 4,
    name: "Omar Siddiqui",
    location: "New York, USA",
    rating: 5,
    text: "Finally found a trustworthy service to send authentic Pakistani food items to my home abroad. The packaging was excellent and everything arrived fresh!",
  },
];

export const TestimonialSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <div className="relative">
      {/* Main testimonial card */}
      <div className="testimonial-card relative overflow-hidden">
        {/* Quote icon */}
        <div className="absolute top-4 right-4 text-accent/10">
          <Quote className="h-16 w-16" />
        </div>

        <div className="relative z-10">
          {/* Stars */}
          <div className="flex gap-1 mb-4 justify-center">
            {[...Array(currentTestimonial.rating)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-accent text-accent" />
            ))}
          </div>

          {/* Testimonial text */}
          <p className="text-lg text-center mb-6 text-foreground/90 max-w-2xl mx-auto">
            "{currentTestimonial.text}"
          </p>

          {/* Author info */}
          <div className="text-center">
            <p className="font-semibold text-foreground">{currentTestimonial.name}</p>
            <p className="text-sm text-muted-foreground">{currentTestimonial.location}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPrevious}
          className="rounded-full h-10 w-10 border-border/50 hover:border-accent hover:bg-accent/5"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Dots */}
        <div className="flex gap-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsAutoPlaying(false);
                setCurrentIndex(index);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "w-8 bg-accent"
                  : "w-2 bg-border hover:bg-accent/50"
              }`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={goToNext}
          className="rounded-full h-10 w-10 border-border/50 hover:border-accent hover:bg-accent/5"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};