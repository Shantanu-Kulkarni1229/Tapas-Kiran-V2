import React from "react";

const Sidebar = ({ pdfList, onSelectPDF }) => {
  return (
    <div className="w-64 bg-gray-100 border-r border-gray-300 h-screen p-4">
      <h2 className="text-lg font-semibold mb-4 text-gray-700">📄 PDF Templates</h2>
      <ul className="space-y-2">
        {pdfList.map((pdf, index) => (
          <li
            key={index}
            className="p-2 rounded-lg cursor-pointer hover:bg-blue-100 transition"
            onClick={() => onSelectPDF(pdf)}
          >
            {pdf.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
