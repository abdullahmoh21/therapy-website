import React from 'react'
import aboutMe_hero from '../assets/images/aboutMe_hero.png';

const About = () => {
  return (
    <>
      <h1 className='text-[51.27px] font-bold text-[#c45e3e] text-center'>About Me</h1>
      <div className='w-full flex flex-row items-center justify-center'>
        <img src={aboutMe_hero} height={480} width={456} alt="Fatima Mohsin's Picture"/>
      </div>
    
    </>
  );
};

export default About;