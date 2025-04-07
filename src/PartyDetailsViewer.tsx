import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export default function PartyDetailsViewer() {
  const [file, setFile] = useState(null);
  const [parties, setParties] = useState([]);
  const [dateLabel, setDateLabel] = useState("");
  const fileInputRef = useRef(null);

  const formatTime = (time) => {
    if (typeof time === "number") {
      const totalMinutes = Math.round(time * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    } else if (typeof time === "string") {
      const match = time.match(/^(\d{1,2}):(\d{2})$/);
      if (match) return time;
    }
    return "Invalid Time";
  };

  const calculatePrepTime = (eatInParty) => {
    const timeStr = formatTime(eatInParty);
    if (timeStr === "Invalid Time") return timeStr;

    const [hours, minutes] = timeStr.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes - 20;
    if (totalMinutes < 0) return "Invalid Time";

    const prepHours = Math.floor(totalMinutes / 60);
    const prepMinutes = totalMinutes % 60;
    return `${prepHours.toString().padStart(2, "0")}:${prepMinutes.toString().padStart(2, "0")}`;
  };

  const buildFoodString = (foodObj) => {
    return Object.entries(foodObj)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => {
        const label = key
          .replace(/([A-Z])/g, " $1")
          .replace(/^\\w/, (c) => c.toUpperCase());
        return `${label.trim()}: ${value}`;
      })
      .join("  ");
  };

  const parseSpreadsheet = (uploadedFile) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = "Day Printout";
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
          alert(`Sheet "${sheetName}" not found in the uploaded file.`);
          return;
        }

        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (!jsonData.length) {
          alert("No data found in the sheet.");
          return;
        }

        const firstRow = jsonData[0];
        if (firstRow && firstRow.length > 1) {
          const dateCells = firstRow.slice(1, 7).filter(Boolean);
          setDateLabel(dateCells.join(" "));
        }

        const parsedParties = jsonData
          .slice(2)
          .filter((row) => row[6] && row[6] !== "Name")
          .map((row) => ({
            eatInParty: row[4],
            name: row[6],
            partyRoom: row[2],
            numKids: row[9],
            partyType: row[10],
            kidsFood: {
              hotChips: row[11] || 0,
              biscuits: row[12] || 0,
              popcorn: row[14] || 0,
              cordial: row[15] || 0,
              nuggets: row[16] || 0,
            },
            adultFood: {
              margherita: row[51] || 0,
              hawaiian: row[52] || 0,
              meatlover: row[53] || 0,
              vegetarian: row[54] || 0,
              bbqChicken: row[56] || 0,
            },
            comments: row[64] || "",
          }));

        setParties(parsedParties);
      } catch (error) {
        console.error("Error parsing file", error);
        alert("An error occurred while reading the file.");
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      parseSpreadsheet(uploadedFile);
    }
  };

  const handleDownloadPDF = async () => {
    const input = document.getElementById("pdf-content");
    if (!input) return;

    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("parties.pdf");
  };

  const resetForm = () => {
    setFile(null);
    setParties([]);
    setDateLabel("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="mb-6">
        <input
          type="file"
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 
                     file:rounded file:border-0 file:text-sm file:font-semibold 
                     file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileUpload}
          ref={fileInputRef}
        />
      </div>

      <div id="pdf-content" className="space-y-4">
        {dateLabel && (
          <div className="text-lg font-bold text-center mb-4">{dateLabel}</div>
        )}

        {parties.map((party, idx) => {
          const bgColor = idx % 2 === 0 ? "bg-blue-50" : "bg-green-50";
          return (
            <div key={idx} className={`border border-black ${bgColor}`}>
              <div className="grid grid-cols-1 divide-y divide-black">
                <div className="p-2">
                  <span className="font-bold">Prep time:</span> {calculatePrepTime(party.eatInParty)} &nbsp;
                  Eat time: {formatTime(party.eatInParty)} &nbsp;
                  Kid's Name: {party.name} &nbsp;
                  Party Room: {party.partyRoom} &nbsp;
                  Kids: {party.numKids} &nbsp;
                  Party Type: {party.partyType || "(none)"}
                </div>
                
                <div className="p-2">
                  <span className="font-bold">Kids Food:</span> &nbsp;
                  {buildFoodString(party.kidsFood) || "(none)"}
                </div>
                
                <div className="p-2">
                  <span className="font-bold">Adult Food:</span> &nbsp;
                  {buildFoodString(party.adultFood) || "(none)"}
                </div>
                
                <div className="p-2">
                  <span className="font-bold">Comment:</span> &nbsp;
                  {party.comments || "(none)"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-6">
        <button
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          onClick={resetForm}
        >
          Reset
        </button>

        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={parties.length === 0}
          onClick={handleDownloadPDF}
        >
          Download PDF
        </button>
      </div>
    </div>
  );
}