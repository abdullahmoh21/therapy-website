import React, { useState, useEffect } from "react";
import {
  useGetSystemHealthQuery,
  useUpdateConfigMutation,
} from "../../../features/admin/adminApiSlice";
import { ProgressSpinner } from "primereact/progressspinner";
import { InputText } from "primereact/inputtext";
import { toast } from "react-toastify";
import {
  FaServer,
  FaDatabase,
  FaMemory,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaInfoCircle,
  FaSave,
  FaEdit,
  FaUndo,
  FaMicrochip,
} from "react-icons/fa";
import { SiRedis } from "react-icons/si";
import LoadingPage from "../../../pages/LoadingPage";

const StatusIndicator = ({ status }) => {
  let icon;
  let colorClass;
  let text;

  switch (status?.toLowerCase()) {
    case "running":
    case "connected":
    case "ready":
      icon = <FaCheckCircle />;
      colorClass = "text-green-500";
      text = status;
      break;
    case "disconnected":
    case "error":
      icon = <FaTimesCircle />;
      colorClass = "text-red-500";
      text = status;
      break;
    default:
      icon = <FaExclamationTriangle />;
      colorClass = "text-yellow-500";
      text = status || "Unknown";
  }

  return (
    <span className={`flex items-center gap-2 font-medium ${colorClass}`}>
      {icon} {text}
    </span>
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

  return (
    <div className="mb-4 p-4 rounded-lg bg-white border border-gray-200 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold text-lg text-gray-800">{configKey}</h4>
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

const SystemHealth = () => {
  const {
    data: healthData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetSystemHealthQuery(undefined, {
    pollingInterval: 30000, // Refetch every 30 seconds
    refetchOnMountOrArgChange: true,
  });

  const [updateConfig, { isLoading: isUpdatingConfig }] =
    useUpdateConfigMutation();

  const handleSaveConfig = async (key, value) => {
    try {
      await updateConfig({ key, value }).unwrap();
      toast.success(`Configuration '${key}' updated successfully!`);
      refetch(); // Refetch health data to show updated value
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
            "Failed to load system health data."}
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

  const { server, redis, memory, database, configurations } = healthData || {};

  const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">System Health</h1>
        <p className="mt-2 text-gray-600">
          Monitor server performance and manage system configurations
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Server Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center">
            <FaServer className="text-[#DF9E7A] mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">
              Server Status
            </h2>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <StatusIndicator status={server?.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 flex items-center">
                Uptime:
                <span
                  className="ml-1 cursor-help text-gray-400"
                  title="The amount of time the server has been running continuously without restarts."
                >
                  <FaInfoCircle size={12} />
                </span>
              </span>
              <span className="font-medium">
                {formatUptime(server?.uptime || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Node Version:</span>
              <span className="font-medium">{server?.nodeVersion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Platform:</span>
              <span className="font-medium">{server?.platform}</span>
            </div>
          </div>
        </div>

        {/* Redis Cache */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center">
            <SiRedis className="text-[#DF9E7A] mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">Redis Cache</h2>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <StatusIndicator status={redis?.status} />
            </div>

            {redis?.info && Object.keys(redis.info).length > 0 && (
              <div className="mt-4 space-y-3 border-t pt-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  Redis Details
                </h3>

                {redis.info.keys !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 flex items-center">
                      Keys:
                      <span
                        className="ml-1 cursor-help text-gray-400"
                        title="The number of cached items currently stored in Redis. Each key represents a separate piece of cached data."
                      >
                        <FaInfoCircle size={12} />
                      </span>
                    </span>
                    <span className="font-medium">{redis.info.keys}</span>
                  </div>
                )}

                {redis.info.connected_clients !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Connected Clients:</span>
                    <span className="font-medium">
                      {redis.info.connected_clients}
                    </span>
                  </div>
                )}

                {redis.info.used_memory !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 flex items-center">
                      Memory Used:
                      <span
                        className="ml-1 cursor-help text-gray-400"
                        title="The amount of RAM currently being used by Redis to store cached data and for internal operations."
                      >
                        <FaInfoCircle size={12} />
                      </span>
                    </span>
                    <span className="font-medium">
                      {Math.round(
                        (parseInt(redis.info.used_memory) / 1024 / 1024) * 100
                      ) / 100}{" "}
                      MB
                    </span>
                  </div>
                )}

                {redis.dockerized && (
                  <div className="mt-2 text-xs text-blue-600 flex items-center">
                    <FaInfoCircle className="mr-1" /> Running in Docker
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Database */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center">
            <FaDatabase className="text-[#DF9E7A] mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">
              Database (MongoDB)
            </h2>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <StatusIndicator status={database?.status} />
            </div>

            {database?.status === "Connected" &&
            database?.stats &&
            !database.stats.error ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">DB Name:</span>
                  <span className="font-medium">{database.stats.db}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Collections:</span>
                  <span className="font-medium">
                    {database.stats.collections}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 flex items-center">
                    Objects:
                    <span
                      className="ml-1 cursor-help text-gray-400"
                      title="The total number of documents (records) stored across all collections in the database."
                    >
                      <FaInfoCircle size={12} />
                    </span>
                  </span>
                  <span className="font-medium">{database.stats.objects}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 flex items-center">
                    Data Size:
                    <span
                      className="ml-1 cursor-help text-gray-400"
                      title="The actual size of the data stored in the database, not including indexes or allocated but unused space."
                    >
                      <FaInfoCircle size={12} />
                    </span>
                  </span>
                  <span className="font-medium">
                    {database.stats.dataSizeMB} MB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 flex items-center">
                    Storage Size:
                    <span
                      className="ml-1 cursor-help text-gray-400"
                      title="The total size allocated for database storage, including used and reserved space. This is typically larger than Data Size due to MongoDB's pre-allocation strategy."
                    >
                      <FaInfoCircle size={12} />
                    </span>
                  </span>
                  <span className="font-medium">
                    {database.stats.storageSizeMB} MB
                  </span>
                </div>
              </>
            ) : database?.stats?.error ? (
              <div className="text-red-500 flex items-center">
                <FaInfoCircle className="mr-2" /> {database.stats.error}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* CPU Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center">
          <FaMicrochip className="text-[#DF9E7A] mr-2" />
          <h2 className="text-lg font-semibold text-gray-800">CPU</h2>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Model:</span>
            <span className="font-medium text-sm truncate max-w-[200px]">
              {healthData?.cpu?.model}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Cores:</span>
            <span className="font-medium">{healthData?.cpu?.count}</span>
          </div>
          <div className="mt-3">
            <h3 className="text-sm font-semibold mb-2 flex items-center">
              Load Average
              <span
                className="ml-1 cursor-help text-gray-400"
                title="The average system load over different time periods. Load represents the number of processes using or waiting for CPU time. Values exceeding your CPU core count indicate your system is under stress."
              >
                <FaInfoCircle size={12} />
              </span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 p-2 rounded text-center">
                <div className="text-xs text-gray-500">1 min</div>
                <div className="font-semibold">{healthData?.cpu?.load1}</div>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center">
                <div className="text-xs text-gray-500">5 min</div>
                <div className="font-semibold">{healthData?.cpu?.load5}</div>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center">
                <div className="text-xs text-gray-500">15 min</div>
                <div className="font-semibold">{healthData?.cpu?.load15}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Memory Usage */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center">
          <FaMemory className="text-[#DF9E7A] mr-2" />
          <h2 className="text-lg font-semibold text-gray-800">Memory Usage</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center">
                Process RSS
                <span
                  className="ml-1 cursor-help text-gray-400"
                  title="Resident Set Size - the actual amount of physical memory used by the Node.js process, including code, heap, and external memory."
                >
                  <FaInfoCircle size={10} />
                </span>
              </div>
              <div className="text-xl font-semibold">{memory?.rssMB} MB</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center">
                Heap Total
                <span
                  className="ml-1 cursor-help text-gray-400"
                  title="The total memory allocated for JavaScript objects in the Node.js process. This is the V8 engine's memory allocation."
                >
                  <FaInfoCircle size={10} />
                </span>
              </div>
              <div className="text-xl font-semibold">
                {memory?.heapTotalMB} MB
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center">
                Heap Used
                <span
                  className="ml-1 cursor-help text-gray-400"
                  title="The amount of heap memory actually being used by JavaScript objects. If this grows continuously, it may indicate a memory leak."
                >
                  <FaInfoCircle size={10} />
                </span>
              </div>
              <div className="text-xl font-semibold">
                {memory?.heapUsedMB} MB
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center">
                External
                <span
                  className="ml-1 cursor-help text-gray-400"
                  title="Memory used by C++ objects bound to JavaScript objects, such as buffers. This memory is not managed by V8's garbage collector."
                >
                  <FaInfoCircle size={10} />
                </span>
              </div>
              <div className="text-xl font-semibold">
                {memory?.externalMB} MB
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex justify-between">
              <span className="text-sm text-gray-600">System Memory Usage</span>
              <span className="text-sm font-medium">
                {memory?.systemUsedPercent}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-[#DF9E7A] h-2.5 rounded-full"
                style={{ width: `${memory?.systemUsedPercent || 0}%` }}
              ></div>
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>Used: {memory?.systemUsedMB} MB</span>
              <span>Free: {memory?.systemFreeMB} MB</span>
              <span>Total: {memory?.systemTotalMB} MB</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            System Configuration
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

export default SystemHealth;
