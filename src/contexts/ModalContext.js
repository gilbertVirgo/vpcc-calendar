import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
	const [content, setContent] = useState(null);

	const overlayRef = useRef(null);
	const previouslyFocused = useRef(null);

	const showModal = useCallback((node) => {
		setContent(() => node);
	}, []);

	const closeModal = useCallback(() => {
		setContent(null);
	}, []);

	useEffect(() => {
		if (!content) return;

		// save currently focused element
		previouslyFocused.current = document.activeElement;

		// prevent background scroll
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		function onKey(e) {
			if (e.key === "Escape") {
				closeModal();
			}
			if (e.key === "Tab" && overlayRef.current) {
				const focusable = overlayRef.current.querySelectorAll(
					'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
				);
				if (focusable.length === 0) return;
				const first = focusable[0];
				const last = focusable[focusable.length - 1];
				if (e.shiftKey && document.activeElement === first) {
					e.preventDefault();
					last.focus();
				} else if (!e.shiftKey && document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		}

		document.addEventListener("keydown", onKey);

		// focus the first focusable element inside modal
		requestAnimationFrame(() => {
			if (!overlayRef.current) return;
			const focusable = overlayRef.current.querySelectorAll(
				'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
			);
			if (focusable.length) focusable[0].focus();
			else overlayRef.current.focus();
		});

		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = prevOverflow;
			try {
				previouslyFocused.current && previouslyFocused.current.focus();
			} catch (err) {
				// ignore
			}
		};
	}, [content, closeModal]);

	return (
		<ModalContext.Provider value={{ showModal, closeModal }}>
			{children}
			{content ? (
				<div
					className="modal-overlay"
					onClick={closeModal}
					ref={overlayRef}
				>
					<div
						className="modal"
						onClick={(e) => e.stopPropagation()}
						role="dialog"
						aria-modal="true"
					>
						{typeof content === "function"
							? content({ close: closeModal })
							: content}
						<div style={{ marginTop: "1rem" }}>
							<button onClick={closeModal}>Close</button>
						</div>
					</div>
				</div>
			) : null}
		</ModalContext.Provider>
	);
}

export function useModal() {
	const ctx = useContext(ModalContext);
	if (!ctx) throw new Error("useModal must be used within a ModalProvider");
	return ctx;
}

export default ModalContext;
