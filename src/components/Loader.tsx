import React from "react";
import { Atom } from "react-loading-indicators";

interface LoaderProps {
  color?: string;
  size?: "small" | "medium" | "large";
  text?: string;
  textColor?: string;
  fullScreen?: boolean;
}

const Loader: React.FC<LoaderProps> = ({
  color = "#010101",
  size = "medium",
  text = "",
  textColor = "",
  fullScreen = true,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center ${
        fullScreen ? "min-h-screen w-full bg-white" : "w-full py-12"
      }`}
    >
      <Atom color={color} size={size} text={text} textColor={textColor} />
    </div>
  );
};

export const CircularSpinner: React.FC<{
  size?: "sm" | "md" | "lg" | "small" | "medium" | "large";
  dark?: boolean;
  color?: string;
}> = ({ size = "md", dark = false, color }) => {
  const mappedSize =
    size === "sm" || size === "small"
      ? "small"
      : size === "lg" || size === "large"
      ? "large"
      : "medium";
  const finalColor = color || (dark ? "#ffffff" : "#010101");
  return <Atom color={finalColor} size={mappedSize} text="" textColor="" />;
};

export default Loader;

