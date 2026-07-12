import { useEffect, useState } from "react";

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
  staggerDelay?: number;
  once?: boolean;
}

export const AnimatedText = ({
  text,
  className = "",
  delay = 0,
  staggerDelay = 0.08,
  once = true,
}: AnimatedTextProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const words = text.split(" ");

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <span className={`inline-flex flex-wrap ${className}`}>
      {words.map((word, index) => (
        <span
          key={index}
          className="inline-block mr-[0.25em] overflow-hidden"
          style={{
            transition: "opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(100%)",
            transitionDelay: `${index * staggerDelay}s`,
          }}
        >
          {word}
        </span>
      ))}
    </span>
  );
};

export const AnimatedFadeIn = ({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  const directionOffset = {
    up: "translateY(20px)",
    down: "translateY(-20px)",
    left: "translateX(20px)",
    right: "translateX(-20px)",
  };

  return (
    <div
      className={className}
      style={{
        transition: "opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1), transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translate(0)" : directionOffset[direction],
      }}
    >
      {children}
    </div>
  );
};
