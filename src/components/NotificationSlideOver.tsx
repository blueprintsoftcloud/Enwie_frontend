import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useNotifications } from "../context/NotificationContext";

interface NotificationSlideOverProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationSlideOver({
  open,
  onClose,
}: NotificationSlideOverProps) {
  const { notifications, markAsRead, markAllRead, clearAllNotifications } = useNotifications();

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="w-screen max-w-md pointer-events-auto">
                  <div className="h-full flex flex-col bg-white shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 bg-white border-b">
                      <div>
                        <Dialog.Title className="text-xl font-bold text-gray-900">
                          Notifications
                        </Dialog.Title>

                        <div className="flex items-center gap-3 mt-1">
                          {notifications.some((n) => !n.isRead) && (
                            <button
                              onClick={markAllRead}
                              className="text-xs text-pink-600 hover:text-pink-800 font-medium underline cursor-pointer"
                            >
                              Mark all as read
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button
                              onClick={clearAllNotifications}
                              className="text-xs text-gray-400 hover:text-red-600 font-medium underline cursor-pointer"
                            >
                              Clear all
                            </button>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-900 transition-colors"
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
                      {notifications.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                          <p>No new notifications</p>
                        </div>
                      )}

                      {notifications.map((n) => (
                        <div
                          key={n._id}
                          onClick={() => {
                            if (!n.isRead && (n._id || n.id)) {
                              markAsRead((n._id ?? n.id)!);
                            }
                          }}
                          className={`
                            relative rounded-xl bg-white px-5 py-4 cursor-default
                            border transition-all duration-200
                            ${
                              !n.isRead
                                ? "border-l-4 border-l-pink-500 border-y-gray-100 border-r-gray-100"
                                : "border-gray-200 opacity-75"
                            }
                          `}
                        >
                          <div className="flex justify-between items-start">
                            <div className="w-full">
                              {/* Message */}
                              <p
                                className={`text-sm ${
                                  !n.isRead
                                    ? "font-semibold text-gray-900"
                                    : "font-medium text-gray-700"
                                }`}
                              >
                                {n.message}
                              </p>

                              {/* Customer Info */}
                              {n.triggeredBy ? (
                                <p className="text-xs text-gray-600 mt-1">
                                  Purchased by:{" "}
                                  <span className="font-semibold text-gray-800">
                                    {n.triggeredBy.username ||
                                      n.triggeredBy.email ||
                                      "Unknown User"}
                                  </span>
                                </p>
                              ) : (
                                <p className="text-xs text-gray-400 mt-1 italic">
                                  User info unavailable
                                </p>
                              )}

                              {/* Amount */}
                              {n.orderId && n.orderId.finalAmount && (
                                <p className="text-xs text-green-600 font-medium mt-1">
                                  Amount: ₹{n.orderId.finalAmount}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Time */}
                          <p className="text-[10px] text-gray-400 mt-2 text-right">
                            {n.createdAt
                              ? new Date(n.createdAt).toLocaleString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
