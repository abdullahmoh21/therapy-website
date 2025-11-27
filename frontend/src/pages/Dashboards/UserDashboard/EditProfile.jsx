import {
  useState,
  useEffect,
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useUpdateMyUserMutation } from "../../../features/users/usersApiSlice";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Joi from "joi";
import { parsePhoneNumberFromString } from "libphonenumber-js";

// Custom phone validation function using libphonenumber-js
const validPhone = Joi.string().custom((value, helpers) => {
  // Remove any spaces or non-digit characters except +
  const cleanedValue = value.replace(/[^\d+]/g, "");

  // Ensure it starts with +
  if (!cleanedValue.startsWith("+")) {
    return helpers.message(
      "Phone number must start with + followed by country code"
    );
  }

  // Simple check for reasonable length
  if (cleanedValue.length < 8) {
    return helpers.message("Phone number is too short");
  }
  if (cleanedValue.length > 16) {
    return helpers.message("Phone number is too long");
  }

  // Use libphonenumber-js for additional validation
  try {
    const phoneNumber = parsePhoneNumberFromString(cleanedValue);
    if (phoneNumber && !phoneNumber.isValid()) {
      return helpers.message(
        "Invalid phone number format. Please check country code and number"
      );
    }
  } catch (error) {
    // If parsing fails, rely on basic validation
  }

  return cleanedValue;
}, "Phone number validation");

const JoiSchema = Joi.object({
  name: Joi.string().min(3).max(30).required().messages({
    "string.min": "Name must be at least 3 characters long",
    "string.max": "Name must be less than 30 characters long",
    "any.required": "Name is required",
  }),
  phone: validPhone.required().messages({
    "string.empty": "Phone number is required",
  }),
  DOB: Joi.date().max("now").required().messages({
    "date.base": "Date of Birth must be a valid date",
    "date.max": "Date of Birth cannot be in the future",
    "any.required": "Date of Birth is required",
  }),
});

// Forward ref to expose methods to parent
const EditProfile = forwardRef(({ user, onUserUpdate }, ref) => {
  const [updateUser, { isLoading: isUpdating }] = useUpdateMyUserMutation();

  const maxDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 11);
    return date.toISOString().split("T")[0];
  }, []);

  const [name, setName] = useState(""); // Initialize with empty string
  const [phone, setPhone] = useState("+"); // Always initialize with at least "+"
  const [DOB, setDOB] = useState(""); // Initialize with empty string

  // Store the original values for comparison and reset
  const originalValues = useRef({
    name: "",
    phone: "",
    DOB: "",
  });

  // Initialize form with user data when it becomes available
  useEffect(() => {
    if (user) {
      // Set form values
      setName(user.name || "");

      // Format phone with + if needed
      const formattedPhone = user.phone
        ? user.phone.startsWith("+")
          ? user.phone
          : `+${user.phone}`
        : "+";
      setPhone(formattedPhone);

      setDOB(user.DOB || "");

      // Store original values for reset and comparison
      originalValues.current = {
        name: user.name || "",
        phone: user.phone || "",
        DOB: user.DOB || "",
      };
    }
  }, [user]);

  const onNameChanged = (e) => setName(e.target.value);

  const onPhoneChanged = (e) => {
    let newValue = e.target.value;

    // Handle empty case - ensure + remains
    if (newValue === "" || newValue === "+") {
      setPhone("+");
      return;
    }

    // Add + prefix if missing
    if (!newValue.startsWith("+")) {
      newValue = "+" + newValue.replace(/^\+/, "");
    }

    // Filter out non-digit characters after the +
    newValue = "+" + newValue.substring(1).replace(/\D/g, "");

    setPhone(newValue);
  };

  const handlePhoneKeyDown = (e) => {
    // Only prevent backspace if it would delete the + sign
    if (
      e.key === "Backspace" &&
      e.target.selectionStart <= 1 &&
      e.target.selectionEnd <= 1
    ) {
      e.preventDefault();
    }
  };

  const onDOBChanged = (e) => setDOB(e.target.value);

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Clean up phone format before validation
    const submissionData = {
      name,
      phone: phone.replace(/\s/g, ""),
      DOB,
    };

    const { error } = JoiSchema.validate(submissionData, { abortEarly: false });
    if (error) {
      error.details.forEach((detail) => toast.error(detail.message));
      return;
    }

    let updatedFields = {};

    // Compare with original values from backend
    if (name !== originalValues.current.name) {
      updatedFields.name = name;
    }

    // Handle phone comparison - strip + if needed to match backend format
    const originalPhone = originalValues.current.phone;
    const currentPhone = phone.startsWith("+") ? phone : `+${phone}`;
    const formattedOriginalPhone = originalPhone.startsWith("+")
      ? originalPhone
      : `+${originalPhone}`;

    if (currentPhone !== formattedOriginalPhone && phone !== "+") {
      updatedFields.phone = phone;
    }

    if (DOB !== originalValues.current.DOB) {
      updatedFields.DOB = DOB;
    }

    if (Object.keys(updatedFields).length > 0) {
      try {
        await updateUser(updatedFields).unwrap();
        toast.success("Profile updated successfully.");

        // Update original values after successful update
        originalValues.current = {
          name,
          phone,
          DOB,
        };

        onUserUpdate();
      } catch (err) {
        // Check for specific duplicate phone number error (HTTP 409)
        if (err?.status === 409) {
          toast.error(err?.data?.message || "Phone number already in use.");
        } else {
          toast.error(err?.data?.message || "Failed to update profile.");
        }
      }
    } else {
      toast.info("No changes detected.");
    }
  };

  // Function to reset form to original values
  const resetForm = () => {
    setName(originalValues.current.name || "");

    // Format phone with + if needed
    const originalPhone = originalValues.current.phone;
    if (originalPhone) {
      setPhone(
        originalPhone.startsWith("+") ? originalPhone : `+${originalPhone}`
      );
    } else {
      setPhone("+");
    }

    setDOB(originalValues.current.DOB || "");
  };

  // Expose the resetForm method to parent components
  useImperativeHandle(ref, () => ({
    resetForm,
  }));

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-semibold mb-6 text-center text-textColor">
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
          <input
            className="mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm focus:ring-[#c45e3e] focus:border-[#c45e3e]"
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={onPhoneChanged}
            onKeyDown={handlePhoneKeyDown}
            placeholder="+[country code] phone number"
          />
          <span className="mt-1 text-xs text-gray-500">
            Example: +92 for Pakistan, +1 for USA, +44 for UK, etc.
          </span>
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
});

export default EditProfile;
