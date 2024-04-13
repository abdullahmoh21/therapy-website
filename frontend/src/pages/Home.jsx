import React from 'react';
import fatima_hero from '../assets/images/fatima_hero.png';
import { NavLink, Link } from 'react-router-dom';

const Home = () => {
  return (
    <>
      <section className='2xl:h-[800px] w-full home-bg'>
        <div className='flex justify-center items-center h-screen'>
          <div className='container flex flex-row justify-center w-full mt-[-80px]'>
            {/* ----- Hero Image ------- */}
            <div className='flex items-center'>
              <img src={fatima_hero} height={808} width={520} alt="Fatima Mohsin Picture" />
            </div>
            {/* ----- Hero Text ------- */}
            <div className='flex items-center'>
              <div className='flex flex-col lg:flex-row gap-[90px] items-center justify-between'>
                <div>
                  <div className='lg:w-[570px] ml-[40px]'>
                    <h1 className='text-[51.27px] leading-[46px] font-semibold text-headingColor mr-[200px] w-full'>Fatima Mohsin Naqvi, </h1>
                    <h2 className='text-[26.25px] leading-[46px] text-headingColor mr-[200px] w-full pb-3'>Licensed Therapist | NYU Graduate</h2>
                    <Link to='/signup' className='py-2 px-3 bg-black text-white h-[58px] w-[179px]
                             border-white rounded-[20px] hover:bg-[#2c2c2c]'>Book a Session</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------ First Orange Section ------- */}
      <section className='bg-[#c45e3e] h-[663px]'>
        <div className='w-full'>

          <h1 className='text-[51.27px] text-center font-bold text-white mx-auto w-full pb-[60px]'>Lorem Ipsum</h1>

          {/* Paragraph */}
          <div className='mr-[76px] ml-[76px]'>
            <p className='text-[19px] text-white text-left w-full pb-[20px]'>
            Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.
            </p>
            <p className='text-[19px] text-white text-left w-full'>
            It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).
            </p>
          </div>
        </div>
      </section>

      {/* ------ Second White ------- */}
      <section className='home-bg h-[663px]'>
        
      </section>


    </>
  );
};

export default Home;
