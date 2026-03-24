import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass";
}

export default function Card({
  children,
  className = "",
  variant = "glass",
}: CardProps) {
  const baseStyles = "rounded-xl border transition-smooth";
  const variantStyles = {
    glass: "glass border-blue-200/50 hover:border-blue-400/50",
    default: "bg-white border-gray-200",
  };

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {children}
    </div>
  );
}
