import React from "react";
import { Link } from "react-router-dom";
import {
  useGetAllUsersQuery,
  useDeleteUserMutation,
} from "../../../features/users/usersApiSlice";

const AdminDashboard = () => {
  const { data: usersData, isLoading, isError } = useGetAllUsersQuery();
  const [deleteUser] = useDeleteUserMutation();

  if (isLoading) return "Loading...";
  if (isError) return "An error has occurred";

  const users = usersData ? Object.values(usersData.entities) : [];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
      <Link to="/dash" className="text-blue-500 underline mb-4 block">
        Edit My Details
      </Link>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            <th className="py-4 px-6 bg-grey-lightest font-bold uppercase text-sm text-grey-dark border-b border-grey-light">
              Name
            </th>
            <th className="py-4 px-6 bg-grey-lightest font-bold uppercase text-sm text-grey-dark border-b border-grey-light">
              Email
            </th>
            <th className="py-4 px-6 bg-grey-lightest font-bold uppercase text-sm text-grey-dark border-b border-grey-light">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-grey-lighter">
              <td className="py-4 px-6 border-b border-grey-light">
                {user.name}
              </td>
              <td className="py-4 px-6 border-b border-grey-light">
                {user.email}
              </td>
              <td className="py-4 px-6 border-b border-grey-light">
                <button
                  onClick={() => deleteUser(user.email)}
                  className="text-white bg-red-500 border-0 py-2 px-8 focus:outline-none hover:bg-red-600 rounded text-lg"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboard;
