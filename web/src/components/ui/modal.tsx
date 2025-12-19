import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Content */}
            <div className="relative z-50 w-full max-w-lg scale-100 gap-4 bg-slate-900 border border-slate-800 p-6 shadow-2xl duration-200 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 sm:rounded-lg">
                <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold leading-none tracking-tight text-white">{title}</h2>
                        <button
                            onClick={onClose}
                            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                        >
                            <X className="h-5 w-5 text-slate-400 hover:text-white transition-colors" />
                            <span className="sr-only">Close</span>
                        </button>
                    </div>
                </div>
                {children}
            </div>
        </div>,
        document.body
    )
}
