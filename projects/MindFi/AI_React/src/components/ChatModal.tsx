// Modal.tsx
import React from "react"
import { useTranslation } from "react-i18next"

interface ModalProps {
    open: boolean
    onClose: () => void
    children: React.ReactNode
}

export default function Modal({ open, onClose, children }: ModalProps) {
    if (!open) return null
    const { t } = useTranslation()

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div
                className="relative flex overflow-hidden rounded-lg shadow-lg w-[700px] h-[490px]
                           bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-5 h-5 flex justify-center items-center rounded-full cursor-pointer
                               text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                    ✕
                </button>

                {/* 左侧菜单 */}
                <div className="w-1/3 p-6 flex flex-col border-r
                                bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                    <h2 className="text-lg font-semibold mb-4">
                        {t("chatModal.connectWallet", "Connect a Wallet")}
                    </h2>
                    <div className="flex flex-col gap-3">{children}</div>
                </div>

                {/* 右侧说明 */}
                <div className="flex-1 p-6 flex flex-col">
                    <div className="mb-4">
                        <h2 className="text-lg text-center font-bold">
                            {t("chatModal.whatWallet")}
                        </h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h3 className="font-medium">
                                {t("chatModal.easyLogin.title")}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {t("chatModal.easyLogin.introduce")}
                            </p>
                        </div>
                        <div>
                            <h3 className="font-medium">
                                {t("chatModal.storeAssets.title")}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {t("chatModal.storeAssets.introduce")}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
