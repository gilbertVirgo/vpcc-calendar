import React from "react";
import { useModal } from "./ModalContext";

// A small hook that shows a confirmation modal and returns a Promise
export function useConfirm() {
	const { showModal, closeModal } = useModal();

	return function confirm({
		title = "Confirm",
		message = "Are you sure?",
		confirmText = "OK",
		cancelText = "Cancel",
		input = false,
		choices = null,
	}) {
		return new Promise((resolve) => {
			function onConfirm(value) {
				closeModal();
				resolve(value !== undefined ? value : true);
			}
			function onCancel() {
				closeModal();
				resolve(false);
			}

			showModal(() => (
				<div>
					<h3>{title}</h3>
					<p>{message}</p>
					{input ? (
						<input id="confirm-input" style={{ width: "100%" }} />
					) : null}
					{Array.isArray(choices) ? (
						<div
							style={{
								marginTop: "1rem",
								display: "flex",
								gap: "0.5rem",
							}}
						>
							{choices.map((c, idx) => (
								<button
									key={idx}
									onClick={() =>
										onConfirm(
											c.value !== undefined
												? c.value
												: c.label
										)
									}
								>
									{c.label}
								</button>
							))}
							<button onClick={onCancel}>{cancelText}</button>
						</div>
					) : (
						<div
							style={{
								marginTop: "1rem",
								display: "flex",
								gap: "0.5rem",
							}}
						>
							<button
								onClick={() => {
									if (input) {
										const v =
											document.getElementById(
												"confirm-input"
											).value;
										onConfirm(v);
									} else {
										onConfirm(true);
									}
								}}
							>
								{confirmText}
							</button>
							<button onClick={onCancel}>{cancelText}</button>
						</div>
					)}
				</div>
			));
		});
	};
}

export default useConfirm;
