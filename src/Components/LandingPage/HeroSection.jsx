import React from "react";

const HeroSection = () => {
  return (
    <>
      <div className="flex flex-col items-center bg-[#cbcaca] justify-start pt-[200px] min-h-screen text-black">
        <h1
          className="text-6xl font-bold mb-4"
          style={{ fontFamily: "Comic Sans MS" }}
        >
          Welcome to <span className="text-[#4CAF50]">WageCompute</span>
        </h1>
        <h2
          className="text-4xl mb-8 font-bold text-center px-4"
          style={{ fontFamily: "Comic Sans MS" }}
        >
          simple, efficient, yet affordable
        </h2>
        <p className="text-xl mb-8 text-center px-4">
          Your ultimate tool for accurate wage calculations and financial
          insights.
        </p>
        <a
          href="/login"
          className="bg-[#4CAF50] text-white font-semibold px-6 py-3 rounded-[10px] shadow-lg hover:bg-gray-100 transition"
        >
          Get Started - It's Free!
        </a>
      </div>
    </>
  );
};

export default HeroSection;
