import React, { useState, useEffect } from "react";
import {
  useGetAllConfigsQuery,
  useUpdateConfigMutation,
} from "../../../features/admin/adminApiSlice";
import { ProgressSpinner } from "primereact/progressspinner";
import { InputText } from "primereact/inputtext";
import { toast } from "react-toastify";
import {
  FaSave,
  FaEdit,
  FaUndo,
  FaPlus,
  FaTrash,
  FaTimesCircle,
  FaCog,
} from "react-icons/fa";
import { FiCreditCard } from "react-icons/fi";
import LoadingPage from "../../../pages/LoadingPage";

const BankAccountsEditor = ({ accounts, onChange, isSaving }) => {
  const [bankAccounts, setBankAccounts] = useState(accounts || []);

  useEffect(() => {
    setBankAccounts(accounts || []);
  }, [accounts]);

  const handleAdd = () => {
    setBankAccounts([
      ...bankAccounts,
      { bankAccount: "", accountNo: "", accountTitle: "" },
    ]);
  };

  const handleRemove = (index) => {
    const updatedAccounts = [...bankAccounts];
    updatedAccounts.splice(index, 1);
    setBankAccounts(updatedAccounts);
    onChange(updatedAccounts);
  };

  const handleChange = (index, field, value) => {
    const updatedAccounts = [...bankAccounts];
    updatedAccounts[index][field] = value;
    setBankAccounts(updatedAccounts);
    onChange(updatedAccounts);
  };

  return (
    <div className="space-y-4">
      {bankAccounts.map((account, index) => (
        <div
          key={index}
          className="p-4 border border-gray-200 rounded-lg bg-gray-50 relative"
        >
          <button
            onClick={() => handleRemove(index)}
            className="absolute top-2 right-2 text-red-500 hover:text-red-700 transition-colors"
            disabled={isSaving}
            title="Remove bank account"
          >
            <FaTrash />
          </button>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank/Service Name
              </label>
              <InputText
                value={account.bankAccount}
                onChange={(e) =>
                  handleChange(index, "bankAccount", e.target.value)
                }
                className="w-full"
                placeholder="e.g., Meezan Bank, Jazz Cash"
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <InputText
                value={account.accountNo}
                onChange={(e) =>
                  handleChange(index, "accountNo", e.target.value)
                }
                className="w-full"
                placeholder="Account or phone number"
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Title
              </label>
              <InputText
                value={account.accountTitle}
                onChange={(e) =>
                  handleChange(index, "accountTitle", e.target.value)
                }
                className="w-full"
                placeholder="Name on account"
                disabled={isSaving}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={handleAdd}
        className="flex items-center gap-2 px-4 py-2 text-white bg-lightPink hover:bg-darkPink rounded-md transition-colors"
        disabled={isSaving}
      >
        <FaPlus /> Add Bank Account
      </button>
    </div>
  );
};

const ConfigItem = ({ configKey, data, onSave, isSaving }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(data.value);

  useEffect(() => {
    setCurrentValue(data.value); // Update local state if data changes from parent
  }, [data.value]);

  const handleSave = () => {
    onSave(configKey, currentValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setCurrentValue(data.value);
    setIsEditing(false);
  };

  const getInputType = (value) => {
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "checkbox"; // Or select/radio
    return "text";
  };

  // Special handling for bank accounts array
  if (configKey === "bankAccounts") {
    return (
      <div className="mb-4 p-4 rounded-lg bg-white border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="font-semibold text-lg text-gray-800 flex items-center">
              <FiCreditCard className="mr-2 text-lightPink" />
              Payment Methods
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              {data.description ||
                "Bank and mobile payment account details for client payments"}
            </p>
          </div>
          {data.editable && !isEditing && (
            <button
              className="p-2 text-gray-500 hover:text-gray-700 rounded transition-colors"
              title="Edit Payment Methods"
              onClick={() => setIsEditing(true)}
            >
              <FaEdit />
            </button>
          )}
        </div>

        {isEditing ? (
          <div>
            <BankAccountsEditor
              accounts={currentValue}
              onChange={(accounts) => setCurrentValue(accounts)}
              isSaving={isSaving}
            />

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors flex items-center gap-2"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ProgressSpinner style={{ width: "20px", height: "20px" }} />
                ) : (
                  <FaSave />
                )}
                Save Payment Methods
              </button>
              <button
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors flex items-center gap-2"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <FaUndo />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {Array.isArray(data.value) && data.value.length > 0 ? (
              data.value.map((account, index) => (
                <div
                  key={index}
                  className="p-3 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <h5 className="font-medium text-darkPink">
                    {account.bankAccount}
                  </h5>
                  <p className="text-gray-700 text-sm">
                    Account Title: {account.accountTitle}
                  </p>
                  <p className="text-gray-700 text-sm">
                    Account Number: {account.accountNo}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic">
                No payment methods configured.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4 p-4 rounded-lg bg-white border border-gray-200 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold text-lg text-gray-800">
            {data.displayName || configKey}
          </h4>
          {data.description && (
            <p className="text-sm text-gray-600 mt-1">{data.description}</p>
          )}
        </div>
        {data.editable && !isEditing && (
          <button
            className="p-2 text-gray-500 hover:text-gray-700 rounded transition-colors"
            title="Edit"
            onClick={() => setIsEditing(true)}
          >
            <FaEdit />
          </button>
        )}
      </div>
      <div className="mt-3">
        {isEditing ? (
          <div className="flex items-center gap-3">
            <InputText
              id={`config-${configKey}`}
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              type={getInputType(data.value)}
              className="flex-grow"
              step={typeof data.value === "number" ? "0.01" : undefined}
            />
            <button
              className="p-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              onClick={handleSave}
              disabled={isSaving}
              title="Save"
            >
              <FaSave />
            </button>
            <button
              className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              onClick={handleCancel}
              disabled={isSaving}
              title="Cancel"
            >
              <FaUndo />
            </button>
          </div>
        ) : (
          <p className="text-gray-700 font-mono bg-gray-50 px-3 py-2 rounded inline-block mt-1">
            {String(data.value)}
          </p>
        )}
      </div>
    </div>
  );
};

const SystemConfig = () => {
  const {
    data: configData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetAllConfigsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [updateConfig, { isLoading: isUpdatingConfig }] =
    useUpdateConfigMutation();

  const handleSaveConfig = async (key, value) => {
    try {
      await updateConfig({ key, value }).unwrap();
      toast.success(`Configuration '${key}' updated successfully!`);
      refetch(); // Refetch config data to show updated value
    } catch (err) {
      toast.error(
        `Failed to update configuration '${key}': ${
          err?.data?.message || err.error || "Server error"
        }`
      );
    }
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  if (isError) {
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative m-4"
        role="alert"
      >
        <strong className="font-bold mr-2">
          <FaTimesCircle className="inline-block mb-1" /> Error:
        </strong>
        <span className="block sm:inline">
          {error?.data?.message ||
            error?.error ||
            "Failed to load system configuration data."}
        </span>
        <button
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors"
          onClick={refetch}
        >
          Retry
        </button>
      </div>
    );
  }

  const { configurations } = configData || {};

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          System Configuration
        </h1>
        <p className="mt-2 text-gray-600">
          Manage system settings and payment configuration
        </p>
      </header>

      {/* System Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center">
          <FaCog className="text-[#DF9E7A] mr-2" />
          <h2 className="text-lg font-semibold text-gray-800">
            Configuration Settings
          </h2>
        </div>
        <div className="p-5">
          {configurations && Object.keys(configurations).length > 0 ? (
            Object.entries(configurations).map(([key, configData]) => (
              <ConfigItem
                key={key}
                configKey={key}
                data={configData}
                onSave={handleSaveConfig}
                isSaving={isUpdatingConfig}
              />
            ))
          ) : (
            <p className="text-gray-500 italic">No configurations found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemConfig;
