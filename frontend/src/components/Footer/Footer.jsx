import React from "react";

const Footer = () => {
  return (
    <footer>
      <div className="bg-[#E09E7A] p-6 flex flex-col md:flex-row items-center justify-between text-[#313131] space-y-4 md:space-y-0">
        <div className="flex flex-col items-center md:items-start md:ml-[100px] mb-4 md:mb-0 space-y-2">
          <div className="flex items-center pb-[10px]">
            <i className="pi pi-map-marker text-[#313131] mr-2" />
            <h1 className="text-center md:text-left">
              208B, Street 5, Cavalry Ground, Lahore, Pakistan
            </h1>
          </div>
          <div className="flex items-center pb-[10px]">
            <i className="pi pi-phone text-[#313131] mr-2" />
            <a
              href="tel:+923334245151"
              className="text-[#313131] text-center md:text-left"
            >
              +92 333 4245151
            </a>
          </div>
          <div className="flex items-center">
            <i className="pi pi-envelope text-[#313131] mr-2" />
            <a
              href="mailto:fatimamohsin40@gmail.com"
              className="text-[#313131] text-center md:text-left"
            >
              fatimamohsin40@gmail.com
            </a>
          </div>
        </div>
        <div className="orlega-one flex flex-col items-center md:items-end md:mr-[100px] space-y-4 md:space-y-2">
          <h1 className="orelega-one text-[30px] md:text-[40px] text-[#313131] text-center md:text-right">
            Fatima Mohsin Naqvi
          </h1>
          <div className="flex flex-row lg:justify-center justify-end w-full space-x-4">
            {/* Production: change to actual links */}
            <a
              href="https://www.linkedin.com"
              className="text-[#313131] text-xl"
            >
              <i className="pi pi-linkedin text-[#313131]" />
            </a>
            <a
              href="https://www.twitter.com"
              className="text-[#313131] text-xl"
            >
              <i className="pi pi-twitter text-[#313131]" />
            </a>
            <a
              href="https://wa.me/+923334245151"
              className="text-[#313131] text-xl"
            >
              <i className="pi pi-whatsapp text-[#313131]" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
