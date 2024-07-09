import { useState, useEffect, useRef } from "react";
import { useUpdateMyUserMutation } from "../../../features/users/usersApiSlice";
import { useLogoutMutation } from "../../../features/auth/authApiSlice";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import phonevalidator from "libphonenumber-js";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { useSelector } from "react-redux";
import { selectMyUser } from "../../../features/users/usersApiSlice";
import Joi from "joi";

const validPhone = Joi.string().custom((value, helpers) => {
  if (!phonevalidator(value)?.isValid()) {
    return helpers.message("Phone number must be a valid international number");
  }
  return value;
}, "Phone number validation");

const JoiSchema = Joi.object({
  name: Joi.string().min(3).max(30).required().messages({
    "string.base": "Name must be a string",
    "string.empty": "Name cannot be empty",
    "string.min": "Name must be at least {#limit} characters long",
    "string.max": "Name must be less than {#limit} characters long",
    "any.required": "Name is a required field",
  }),
  phone: validPhone.required().messages({
    "string.empty": "Phone number is required",
    "any.required": "Phone number is a required field",
  }),
  DOB: Joi.date() //allow users above 11 years old
    .iso()
    .max(new Date(new Date().setFullYear(new Date().getFullYear() - 11)))
    .messages({
      "date.empty": "Please enter a valid Date of Birth",
      "date.base": "Please enter a valid Date of Birth",
      "date.format": "Please enter a valid Date of Birth",
      "date.max": "You must be at least 11 years old",
    }),
});

const EditProfile = ({ onUserUpdate }) => {
  const [updateUser, { isLoading: isUpdating, isSuccess: isUpdateSuccess }] = //add updateuser spinner
    useUpdateMyUserMutation();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const userData = useSelector(selectMyUser); //fetch user data from store
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Failed to log out: ", error);
    }
  };

  const [initialUser, setUser] = useState({
    name: "",
    phone: "",
    DOB: "",
    email: "",
  });
  const [name, setName] = useState(initialUser.name);
  const [phone, setPhone] = useState(initialUser.phone);
  const [DOB, setDOB] = useState(initialUser.DOB);

  // set userdata when available from prop
  useEffect(() => {
    if (userData) {
      setUser({
        name: userData.name,
        phone: userData.phone,
        DOB: userData.formattedDob,
        email: userData.email,
      });
      setName(userData.name);
      setPhone(userData.phone);
      setDOB(userData.DOB || "");
    }
  }, [userData]);

  const originalName = useRef(initialUser.name);
  const originalPhone = useRef(initialUser.phone);
  const originalDOB = useRef(initialUser.DOB);
  const onNameChanged = (e) => setName(e.target.value);
  const onPhoneChanged = (phoneString) => setPhone(phoneString);
  const onDOBChanged = (e) => setDOB(e.target.value);

  useEffect(() => {
    // Convert DOB to yyyy-mm-dd format

    let convertedDOB = DOB;
    if (typeof DOB === "string" && DOB.includes("/")) {
      let splitDate = DOB.split("/");
      convertedDOB = [splitDate[2], splitDate[1], splitDate[0]].join("-");
    }
  }, [DOB]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const { error } = JoiSchema.validate({ name, phone, DOB });
    if (error) {
      toast.error(error.details[0].message);
      return;
    }

    let updatedFields = {};

    if (name !== originalName.current) {
      updatedFields.name = name;
    }

    if (phone !== originalPhone.current) {
      updatedFields.phone = phone;
    }

    if (DOB !== originalDOB.current) {
      updatedFields.DOB = DOB;
    }

    if (Object.keys(updatedFields).length > 0) {
      try {
        const { result } = await updateUser(updatedFields).unwrap();
        toast.success("User updated successfully.");
        originalName.current = name;
        originalPhone.current = phone;
        originalDOB.current = DOB;
        onUserUpdate(); // Trigger a re-fetch in the Dashboard component
      } catch {
        toast.error("Failed to update user.");
      }
    } else {
      toast.info("No changes detected.");
    }
  };
  return (
    <form className="p-6 bg-white rounded shadow-md" onSubmit={handleSubmit}>
      <ToastContainer />
      <h2 className="text-2xl font-bold mb-6">Edit User</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium" htmlFor="name">
            Name:
          </label>
          <input
            className="mt-1 p-2 w-full border rounded lp-ignore"
            id="name"
            name="name"
            type="text"
            autoComplete="off"
            value={name}
            onChange={onNameChanged}
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="phone">
            Phone:
          </label>
          <PhoneInput
            defaultCountry="PK"
            value={phone}
            onChange={onPhoneChanged}
            className="mt-1 p-2 w-full border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="DOB">
            Date of Birth:
          </label>
          <input
            className="mt-1 p-2 w-full border rounded lp-ignore"
            type="date"
            name="DOB"
            value={DOB}
            autoComplete="off"
            data-lpignore="true"
            onChange={onDOBChanged}
            max={
              new Date(new Date().setFullYear(new Date().getFullYear() - 11))
                .toISOString()
                .split("T")[0]
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="email">
            Email:
          </label>
          <input
            className="mt-1 p-2 w-full border rounded"
            id="email"
            name="email"
            type="email"
            autoComplete="off"
            value={initialUser.email}
            disabled
          />
        </div>
        <div className="flex justify-center mt-6">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            type="submit"
          >
            {isUpdating ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <div className="spinner"></div>
              </div>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default EditProfile;
