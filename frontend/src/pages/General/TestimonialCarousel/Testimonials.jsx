import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./Testimonials.css";
import comma from "../../../assets/images/comma.png";

const testimonials = [
  {
    id: 1,
    text: " “Fatima’s compassionate and understanding approach made me feel comfortable from the very first session. She helped me navigate my anxiety and find effective coping strategies that I continue to use every day.”",
    authorName: "Abdullah Mohsin Naqvi",
    authorTitle: "Client",
  },
  {
    id: 2,
    text: " “Fatima’s empathy and professionalism set her apart as a therapist. Her collaborative approach ensures that clients feel heard and understood, which is crucial for effective therapy.”  ",
    authorName: "Minahil Khan",
    authorTitle: "Client",
  },
  {
    id: 3,
    text: " “Fatima's guidance and support were instrumental in helping me work through my depression. She provided a safe space for me to express my feelings and offered practical advice that truly made a difference.”",
    authorName: "Ayesha Malik",
    authorTitle: "Client",
  },
  {
    id: 4,
    text: " “I highly recommend Fatima to anyone seeking therapy. Her patience and insightful feedback helped me gain a deeper understanding of myself and develop healthier ways to manage my stress.”",
    authorName: "Mohammad Ali",
    authorTitle: "Client",
  },
];

const TestimonialCarousel = () => {
  const settings = {
    dots: true,
    infinite: true,
    centerMode: true,
    centerPadding: "0",
    autoplay: true,
    speed: 450,
    slidesToShow: 3,
    slidesToScroll: 1,
    adaptiveHeight: true /* Add adaptiveHeight to adjust height dynamically */,
    responsive: [
      {
        breakpoint: 1170,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  return (
    <div className="testimonial-container h-auto pt-[40px]">
      <Slider {...settings}>
        {testimonials.map((testimonial) => (
          <div className="item" key={testimonial.id}>
            <div className="testimonial-content">
              <img
                src={comma}
                alt="comma icon"
                className=" pt-[20px] h-auto w-[30px]"
              />
              <p className="testimonial-text">{testimonial.text}</p>
              <hr />
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default TestimonialCarousel;
