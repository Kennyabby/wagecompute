import { useState } from "react";
import { NavData } from "./navData";

const Navbar = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropDownContent, setDropDownContent] = useState([]);
  return (
    <>
      <div className="fixed top-0 left-0 w-full bg-[#272625]/80 px-[100px] py-[10px] shadow-md z-50 flexbm">
        <img
          src="./enterprisecompute.png"
          alt="enterprise-compute"
          className="w-[70px] h-auto"
        />
        <div className="flex-grow flex justify-center gap-[20px] items-center ml-10">
          {NavData.map((navItem, index) => (
            <button
              key={index}
              className="text-white font-semibold py-2 px-4 hover:text-[#4CAF50] transition-all duration-300"
              onClick={() => {
                setShowDropdown(!showDropdown);
                setDropDownContent(navItem.Modules);
              }}
            >
              {navItem.name}
            </button>
          ))}
        </div>
        <div>
          <button className="bg-white text-[#4CAF50] font-semibold px-6 py-[12px] rounded-[10px] shadow-lg hover:bg-gray-100 transition">
            Sign in
          </button>
          <button className="bg-[#4CAF50] text-white font-semibold px-6 py-[12px] rounded-[10px] shadow-lg hover:bg-red-700 transition ml-4">
            Try for free
          </button>
        </div>
      </div>
      <div
        className={`absolute ${
          showDropdown ? "top-[90px]" : "top-[-100%]"
        } left-0 px-[100px] pt-[40px] bg-white flex flex-col gap-[20px] w-full h-[85vh] transition-all duration-300 overflow-y-auto`}
      >
        <div className="grid grid-cols-4 gap-[50px]">
          {dropDownContent.map((module, idx) => (
            <div key={idx}>
              <h3 className="text-lg font-[700] mb-2">{module.title}</h3>
              <hr className="border-t border-black mb-4" />
              <ul className="space-y-4">
                {module.items.map((item, itemIdx) => (
                  <li
                    key={itemIdx}
                    className="cursor-pointer font-[600] text-gray-600 hover:text-[#4CAF50]"
                  >
                    <a href={`${item.link}`}>{item.name}</a>{" "}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Navbar;
