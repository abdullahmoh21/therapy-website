import { useState, useEffect } from "react";
import { useUpdateMyUserMutation } from "../features/users/usersApiSlice";
import { useLogoutMutation } from "../features/auth/authApiSlice";
import { useGetMyUserQuery } from "../features/users/usersApiSlice";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faSignOutAlt } from "@fortawesome/free-solid-svg-icons";

const NAME_REGEX = /^[A-Za-z\s]{3,25}$/;
const PHONE_REGEX = /^\+\d{1,4}[0-9]{10,15}$/;
const DOB_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const Dashboard = () => {
  const [
    updateUser,
    {
      isLoading: isUpdating,
      isSuccess: isUpdateSuccess,
      isError: isUpdateError,
      error: updateError,
    },
  ] = useUpdateMyUserMutation();

  const navigate = useNavigate();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Failed to log out: ", error);
    }
  };

  const { data, error, isLoading } = useGetMyUserQuery(); //fetch user data

  const [user, setUser] = useState({
    name: "",
    phone: "",
    DOB: "",
    email: "",
  });

  // Update userData when `user` changes
  useEffect(() => {
    if (data) {
      const entities = data.entities;
      const fetchedUser = entities && entities[Object.keys(entities)[0]];

      const dob = new Date(fetchedUser.DOB);
      const formattedDob = `${dob.getFullYear()}-${(dob.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${dob.getDate().toString().padStart(2, "0")}`;
      setUser(fetchedUser);
      setName(fetchedUser.name);
      setPhone(fetchedUser.phone);
      setDOB(formattedDob);
    }
  }, [data]);

  const [name, setName] = useState(user.name);
  const [validName, setValidName] = useState(false);
  const [phone, setPhone] = useState(user.phone);
  const [validPhone, setValidPhone] = useState(false);
  const [DOB, setDOB] = useState(user.DOB);
  const [validDOB, setValidDOB] = useState(false);

  //Validation hooks
  useEffect(() => {
    setValidName(NAME_REGEX.test(name));
  }, [name]);

  useEffect(() => {
    setValidPhone(PHONE_REGEX.test(phone));
  }, [phone]);

  useEffect(() => {
    // Convert DOB to yyyy-mm-dd format
    let convertedDOB = DOB;
    if (DOB.includes("/")) {
      let splitDate = DOB.split("/");
      convertedDOB = [splitDate[2], splitDate[1], splitDate[0]].join("-");
    }
    setValidDOB(DOB_REGEX.test(convertedDOB));
  }, [DOB]);

  const onNameChanged = (e) => setName(e.target.value);
  const onPhoneChanged = (e) => setPhone(e.target.value);
  const onDOBChanged = (e) => setDOB(e.target.value);

  const handleSubmit = (event) => {
    event.preventDefault();
    //TODO: optimize this taking 1.5s to update
    if (!validName || !validPhone || !validDOB) {
      alert("Please correct the invalid fields before submitting."); //
      return;
    }

    let updatedFields = {};

    if (name !== user.name) {
      updatedFields.name = name;
    }

    if (phone !== user.phone) {
      updatedFields.phone = phone;
    }

    if (DOB !== user.DOB) {
      updatedFields.DOB = DOB;
    }
    console.log(`Updated fields: ${JSON.stringify(updatedFields)}`);
    if (Object.keys(updatedFields).length > 0) {
      updateUser(updatedFields);
    } else {
      alert("No fields have been updated.");
    }
  };

  return (
    <form className="p-6 bg-white rounded shadow-md" onSubmit={handleSubmit}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Edit User</h2>
        <div className="space-x-4">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            type="submit"
          >
            Save
          </button>
          <button
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            Logout
          </button>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium" htmlFor="name">
            Name:
          </label>
          <input
            className={`mt-1 p-2 w-full border rounded ${
              validName ? "border-green-500" : "border-red-500"
            }`}
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
          <input
            className={`mt-1 p-2 w-full border rounded ${
              validPhone ? "border-green-500" : "border-red-500"
            }`}
            id="phone"
            name="phone"
            type="text"
            autoComplete="off"
            value={phone}
            onChange={onPhoneChanged}
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="DOB">
            Date of Birth:
          </label>
          <input
            className={`mt-1 p-2 w-full border rounded ${
              validDOB ? "border-green-500" : "border-red-500"
            }`}
            id="DOB"
            name="DOB"
            type="date"
            autoComplete="off"
            value={DOB}
            onChange={onDOBChanged}
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
            value={user.email}
            disabled
          />
        </div>
      </div>
    </form>
  );
};

export default Dashboard;
