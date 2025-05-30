import { useState, useEffect, useRef, useMemo } from "react";
import { useUpdateMyUserMutation } from "../../../features/users/usersApiSlice";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import phonevalidator from "libphonenumber-js";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import Joi from "joi";

const JoiSchema = Joi.object({
  name: Joi.string().min(3).max(30).required().messages({
    "string.min": "Name must be at least 3 characters long",
    "string.max": "Name must be less than 30 characters long",
    "any.required": "Name is required",
  }),
  phone: Joi.string().required().messages({
    "any.required": "Phone number is required",
  }),
  DOB: Joi.date().max("now").required().messages({
    "date.base": "Date of Birth must be a valid date",
    "date.max": "Date of Birth cannot be in the future",
    "any.required": "Date of Birth is required",
  }),
});

// Rename prop from initialUser to user to match DashboardNav
const EditProfile = ({ user, onUserUpdate }) => {
  const [updateUser, { isLoading: isUpdating }] = useUpdateMyUserMutation();

  const maxDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 11);
    return date.toISOString().split("T")[0];
  }, []);

  const [name, setName] = useState(""); // Initialize with empty string
  const [phone, setPhone] = useState(""); // Initialize with empty string
  const [DOB, setDOB] = useState(""); // Initialize with empty string

  // Use refs to store the initial values received from the prop
  const originalName = useRef("");
  const originalPhone = useRef("");
  const originalDOB = useRef("");

  useEffect(() => {
    // When the user prop is available or changes, update the state and refs
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setDOB(user.DOB || ""); // user.DOB is pre-formatted 'YYYY-MM-DD'

      // Update refs to store the initial values from this specific prop instance
      originalName.current = user.name || "";
      originalPhone.current = user.phone || "";
      originalDOB.current = user.DOB || "";
    }
  }, [user]); // Rerun effect if user prop changes

  const onNameChanged = (e) => setName(e.target.value);
  const onPhoneChanged = (phoneString) => setPhone(phoneString);
  const onDOBChanged = (e) => setDOB(e.target.value);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const { error } = JoiSchema.validate(
      { name, phone, DOB },
      { abortEarly: false }
    );
    if (error) {
      error.details.forEach((detail) => toast.error(detail.message));
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
        await updateUser(updatedFields).unwrap();
        toast.success("Profile updated successfully.");

        originalName.current = name;
        originalPhone.current = phone;
        originalDOB.current = DOB;

        onUserUpdate();
      } catch (err) {
        toast.error(err?.data?.message || "Failed to update profile.");
      }
    } else {
      toast.info("No changes detected.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-bold mb-6 text-center text-textColor">
        Edit Your Details
      </h2>
      <div className="space-y-5">
        <div>
          <label
            className="block text-sm font-medium text-textColor mb-1"
            htmlFor="name"
          >
            Name:
          </label>
          <input
            className="mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm focus:ring-[#c45e3e] focus:border-[#c45e3e]"
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={onNameChanged}
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium text-textColor mb-1"
            htmlFor="phone"
          >
            Phone:
          </label>
          <PhoneInput
            defaultCountry="pk"
            value={phone}
            onChange={onPhoneChanged}
            inputClassName="!border-gray-300 focus:!border-[#c45e3e] focus:!ring-[#c45e3e]"
            className="w-full"
            style={{
              "--react-international-phone-border-radius": "0.375rem",
              "--react-international-phone-border-color": "#D1D5DB",
              "--react-international-phone-background-color": "white",
              "--react-international-phone-text-color": "#1F2937",
              "--react-international-phone-font-size": "1rem",
              "--react-international-phone-height": "2.5rem",
            }}
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium text-textColor mb-1"
            htmlFor="DOB"
          >
            Date of Birth:
          </label>
          <input
            className="mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm focus:ring-[#c45e3e] focus:border-[#c45e3e]"
            type="date"
            name="DOB"
            id="DOB"
            value={DOB}
            autoComplete="bday"
            onChange={onDOBChanged}
            max={maxDate}
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium text-textColor mb-1"
            htmlFor="email"
          >
            Email:
          </label>
          <input
            className="mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={user?.email || ""}
            disabled
          />
        </div>
        <div className="flex justify-center pt-4">
          <button
            className="px-6 py-2 bg-[#DF9E7A] text-white font-semibold rounded-md hover:bg-[#c45e3e] transition-colors duration-200 disabled:opacity-50 flex items-center justify-center min-w-[100px]"
            type="submit"
            disabled={isUpdating}
          >
            {isUpdating ? (
              <div className="spinner w-5 h-5 border-t-2 border-white border-solid rounded-full animate-spin"></div>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default EditProfile;
