import React, { useEffect, useContext } from "react";
import ContextProvider from "../../Resources/ContextProvider";
import Navbar from "./Navbar";
import HeroSection from "./HeroSection";

const LandingPage = () => {
  const { storePath } = useContext(ContextProvider);

  useEffect(() => {
    storePath("landing-page");
  }, [storePath]);

  return (
    <>
      <Navbar />
      <HeroSection />
      <section className="bg-white rounded-t-full mt-[-200px] text-black h-[30vh] py-12 px-4">

      </section>
    </>
  );
};

export default LandingPage;
