// ==============================
// src/components/MOTPrintable.tsx
// ==============================

import React from "react";

interface Props {
  mot: any | null;
}

/**
 * Component rendered by react‑to‑print.
 * MUST be wrapped in React.forwardRef so the library can grab the DOM node.
 */
export const MOTPrintable = React.forwardRef<HTMLDivElement, Props>(
  ({ mot }, ref) => {
    if (!mot) return null;

    const issueDate = mot.issueDate?.seconds
      ? new Date(mot.issueDate.seconds * 1000)
      : new Date(mot.issueDate);

    return (
      <div ref={ref} className="p-8 space-y-4">
        <h2 className="text-2xl font-bold">
          Maintenance Order Ticket – {mot.workOrderNumber}
        </h2>

        <div className="space-y-1">
          <p>
            <strong>Station:</strong> {mot.station}
          </p>
          <p>
            <strong>Technician:</strong> {mot.technicianName}
          </p>
          <p>
            <strong>Issue Date:</strong> {issueDate.toLocaleDateString()}
          </p>
          <p>
            <strong>Status:</strong> {mot.status}
          </p>
          <p>
            <strong>Total Cost:</strong> ${Number(mot.totalCost).toLocaleString()}
          </p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">Description</h3>
          <p>{mot.description || "—"}</p>
        </div>

        <div className="text-sm text-gray-500 mt-6">
          Generated automatically by Facility App.
        </div>
      </div>
    );
  }
);

MOTPrintable.displayName = "MOTPrintable";