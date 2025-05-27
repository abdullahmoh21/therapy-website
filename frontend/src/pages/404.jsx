import { NavLink } from "react-router-dom";
import dog from "../assets/images/maggie.webp";

const NotFound = () => {
  return (
    <div className="bg-whiteBg min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto text-center">
        <h1 className="orelega-one text-5xl md:text-7xl text-orangeHeader font-bold mb-4">
          404
        </h1>

        <h2 className="orelega-one text-3xl md:text-4xl text-lightPink mb-6">
          Well, fuck
        </h2>

        <p className="text-lg md:text-xl text-gray-700 mb-4 max-w-2xl mx-auto">
          Either you typo’d the URL, or I tried to deploy without coffee again.
        </p>

        <p className="text-md text-gray-600 mb-10 max-w-xl mx-auto">
          If landing on this dead end stirs up <em>anything</em>, jot it down
          for your next therapy session. My unpaid hours don’t include emotional
          support.
        </p>

        <div className="flex flex-col items-center mb-10">
          <p className="text-md text-gray-600 mb-4">
            Since you’re here anyway, meet Maggie—the real boss around here.
          </p>
          <img
            src={dog}
            alt="Maggie the goodest doggo"
            className="w-56 h-56 object-cover rounded-full shadow-lg border-4 border-lightPink"
          />
        </div>

        <NavLink
          to="/"
          className="inline-block py-3 px-10 bg-orangeButton text-buttonTextBlack border-2 border-black font-semibold rounded-full hover:bg-lightPink transition-all duration-300 transform hover:scale-105 shadow-lg focus:outline-none focus:ring-2 focus:ring-orangeHeader focus:ring-opacity-50"
        >
          Beam Me Back to Sanity
        </NavLink>
      </div>
    </div>
  );
};

export default NotFound;
