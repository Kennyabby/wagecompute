import React, { useEffect, useContext } from "react";
import ContextProvider from "../../Resources/ContextProvider";

const LandingPage = () => {
  const { storePath } = useContext(ContextProvider);

  useEffect(() => {
    storePath("landing-page");
  }, [storePath]);

  return (
    <>
      <h1>Welcome to WageCompute</h1>
    </>
  );
};

export default LandingPage;
