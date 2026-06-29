"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ScreenHeader, Field } from "@/components/Layout";
import { IconCheck } from "@/components/icons";
import { FOCUS_GROUPS } from "@/data/mockData";

export function ProfileScreen({ profile, setProfile, onSaved }) {
  const [form, setForm] = useState(profile);
  const [errors, setErrors] = useState({});
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  
  const [customFocusInput, setCustomFocusInput] = useState("");
  const [customFocuses, setCustomFocuses] = useState(profile.customFocuses || []);

  // Use a ref to keep track of what data is actively inflight or has already been saved to the database.
  // This completely cuts off the infinite loop loop caused by parent component re-renders.
  const lastSavedDataRef = useRef(
    JSON.stringify({
      orgName: profile.orgName,
      yearFounded: profile.yearFounded,
      employees: profile.employees,
      annualIncome: profile.annualIncome,
      serviceArea: profile.serviceArea,
      mission: profile.mission,
      focuses: profile.focuses || [],
      customFocuses: profile.customFocuses || []
    })
  );

  // Form Validation Utility
  const validateForm = (currentForm) => {
    const errs = {};
    if (!currentForm.orgName?.trim()) errs.orgName = "Enter your organization's name.";
    if (!currentForm.yearFounded || isNaN(Number(currentForm.yearFounded))) errs.yearFounded = "Enter a 4-digit year.";
    if (!currentForm.employees || isNaN(Number(currentForm.employees))) errs.employees = "Enter a number.";
    if (!currentForm.focuses || currentForm.focuses.length === 0) errs.focuses = "Select at least one focus area.";
    return errs;
  };

  // Centralized Async Save Function
  const executeSave = useCallback(async (formToSave, currentCustoms) => {
    const validationErrors = validateForm(formToSave);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaveStatus("saving");

    const payload = {
      ...formToSave,
      customFocuses: currentCustoms
    };

    // Serialize what we are actively committing to the database right now
    const currentSerializedPayload = JSON.stringify({
      orgName: payload.orgName,
      yearFounded: payload.yearFounded,
      employees: payload.employees,
      annualIncome: payload.annualIncome,
      serviceArea: payload.serviceArea,
      mission: payload.mission,
      focuses: payload.focuses || [],
      customFocuses: payload.customFocuses || []
    });

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ global: data.error || "Failed to save profile across database." });
        setSaveStatus("error");
        return;
      }

      let finalProfile = payload;
      if (data.profile) {
        finalProfile = {
          id: data.profile.id,
          orgName: data.profile.org_name || data.profile.orgName || formToSave.orgName,
          yearFounded: data.profile.year_founded || data.profile.yearFounded || formToSave.yearFounded,
          employees: data.profile.employees || formToSave.employees,
          annualIncome: data.profile.annual_income || data.profile.annualIncome || formToSave.annualIncome,
          serviceArea: data.profile.service_area || data.profile.serviceArea || formToSave.serviceArea,
          mission: data.profile.mission || formToSave.mission,
          focuses: data.profile.focuses || formToSave.focuses,
          customFocuses: data.profile.custom_focuses || data.profile.customFocuses || currentCustoms
        };
      }

      // Lock this in as our new reference baseline to avoid double triggers
      lastSavedDataRef.current = currentSerializedPayload;
      setProfile(finalProfile);
      setSaveStatus("saved");
      
      if (onSaved) onSaved();

    } catch (err) {
      console.error("Auto-save execution failed:", err);
      setSaveStatus("error");
    }
  }, [setProfile, onSaved]);

  // Content-based Auto-Save Engine (fixes the endless loop loop on keystrokes)
  useEffect(() => {
    const currentDataString = JSON.stringify({
      orgName: form.orgName,
      yearFounded: form.yearFounded,
      employees: form.employees,
      annualIncome: form.annualIncome,
      serviceArea: form.serviceArea,
      mission: form.mission,
      focuses: form.focuses || [],
      customFocuses: customFocuses
    });

    // If local UI state values completely match what we already pushed to the database baseline, drop out.
    if (currentDataString === lastSavedDataRef.current) {
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      executeSave(form, customFocuses);
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [form, customFocuses, executeSave]);

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const toggleFocus = (option) => {
    setForm((f) => {
      const currentFocuses = f.focuses || [];
      const has = currentFocuses.includes(option);
      return {
        ...f,
        focuses: has ? currentFocuses.filter((x) => x !== option) : [...currentFocuses, option]
      };
    });
  };

  const handleAddCustomFocus = (e) => {
    e.preventDefault();
    const cleanInput = customFocusInput.trim();
    if (!cleanInput) return;

    const currentFocuses = form.focuses || [];
    if (currentFocuses.includes(cleanInput)) {
      setCustomFocusInput("");
      return;
    }

    const updatedCustoms = [...customFocuses, cleanInput];
    setCustomFocuses(updatedCustoms);
    setForm((f) => ({ ...f, focuses: [...(f.focuses || []), cleanInput] }));
    setCustomFocusInput("");
  };

  const handleDeleteCustomFocus = (e, optionToRemove) => {
    e.stopPropagation();
    
    const updatedCustoms = customFocuses.filter((x) => x !== optionToRemove);
    setCustomFocuses(updatedCustoms);
    
    setForm((f) => ({
      ...f,
      focuses: (f.focuses || []).filter((x) => x !== optionToRemove)
    }));
  };

  const yearsActive =
    form.yearFounded && !isNaN(Number(form.yearFounded)) ? new Date().getFullYear() - Number(form.yearFounded) : null;

  return (
    <div className="screen">
      <ScreenHeader
        title="Organization profile"
        subtitle="This information is sent to the AI when finding and ranking grants, and when writing proposal drafts."
      />

      {/* Save Status Banner */}
      <div style={{ marginBottom: "1rem", fontSize: "0.875rem", textAlign: "right", minHeight: "20px" }}>
        {saveStatus === "saving" && <span style={{ color: "var(--text-muted)" }}>Saving changes...</span>}
        {saveStatus === "saved" && <span style={{ color: "green", fontWeight: "500" }}>✓ All changes auto-saved</span>}
        {saveStatus === "error" && <span style={{ color: "var(--error)" }}>❌ Auto-save failed. Check backend client connections.</span>}
      </div>

      {errors.global && (
        <div className="panel" style={{ borderColor: "var(--error)", color: "var(--error)", marginBottom: "1rem" }}>
          {errors.global}
        </div>
      )}

      <div className="panel">
        <h3 className="panel-title">Basic information</h3>
        <div className="form-grid">
          <Field label="Organization name" error={errors.orgName} htmlFor="orgName">
            <input
              id="orgName"
              type="text"
              value={form.orgName || ""}
              onChange={(e) => update("orgName", e.target.value)}
              placeholder="e.g. Lengua Viva Language & Cultural Center"
              className={errors.orgName ? "input-error" : ""}
            />
          </Field>
          <Field
            label="Year founded"
            error={errors.yearFounded}
            htmlFor="yearFounded"
            hint={yearsActive != null ? `${yearsActive} years in operation` : null}
          >
            <input
              id="yearFounded"
              type="text"
              inputMode="numeric"
              value={form.yearFounded || ""}
              onChange={(e) => update("yearFounded", e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="e.g. 2014"
              className={errors.yearFounded ? "input-error" : ""}
            />
          </Field>
          <Field label="Number of employees" error={errors.employees} htmlFor="employees">
            <input
              id="employees"
              type="text"
              inputMode="numeric"
              value={form.employees || ""}
              onChange={(e) => update("employees", e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="e.g. 8"
              className={errors.employees ? "input-error" : ""}
            />
          </Field>
          <Field label="Annual income" htmlFor="annualIncome" hint="Used to match grants to your funding scale">
            <div className="input-prefixed">
              <span>$</span>
              <input
                id="annualIncome"
                type="text"
                inputMode="numeric"
                value={form.annualIncome || ""}
                onChange={(e) => update("annualIncome", e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="e.g. 310000"
              />
            </div>
          </Field>
          <Field label="Service area" htmlFor="serviceArea" wide>
            <input
              id="serviceArea"
              type="text"
              value={form.serviceArea || ""}
              onChange={(e) => update("serviceArea", e.target.value)}
              placeholder="e.g. Prince William County, VA"
            />
          </Field>
          <Field label="Mission and values" htmlFor="mission" wide hint="AI uses this to understand your priorities">
            <textarea
              id="mission"
              rows={4}
              value={form.mission || ""}
              onChange={(e) => update("mission", e.target.value)}
              placeholder="Describe who you serve and why your work matters…"
            />
          </Field>
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-title">Grant focus areas</h3>
        <p className="panel-desc">
          Select every area that matches what your organization does. The AI uses these to find and rank grants.
        </p>

        {errors.focuses && (
          <p className="field-error" role="alert" style={{ color: "var(--error)", fontWeight: "500", marginBottom: "1rem" }}>
            {errors.focuses}
          </p>
        )}

        {/* Unified and Styled Custom Focus Area input layout */}
        <div className="form-grid" style={{ marginBottom: "1.5rem" }}>
          <Field label="Add Custom Focus Area" htmlFor="customFocus" wide>
            <div style={{ display: "flex", gap: "0.5rem", width: "100%", alignItems: "center" }}>
              <input
                id="customFocus"
                type="text"
                value={customFocusInput}
                onChange={(e) => setCustomFocusInput(e.target.value)}
                placeholder="e.g., Youth Coding Initiatives"
                style={{ flex: 1 }}
              />
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleAddCustomFocus}
                style={{ whiteSpace: "nowrap", height: "42px", padding: "0 1.25rem" }}
              >
                Add Option
              </button>
            </div>
          </Field>
        </div>

        <div className="focus-groups">
          {customFocuses.length > 0 && (
            <div className="focus-group">
              <h4>Your Custom Focuses</h4>
              <div className="chip-grid">
                {customFocuses.map((opt) => {
                  const selected = form.focuses?.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={`focus-chip${selected ? " focus-chip-selected" : ""}`}
                      onClick={() => toggleFocus(opt)}
                      aria-pressed={selected}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                    >
                      {selected && <IconCheck width={14} height={14} />}
                      <span>{opt}</span>
                      <span
                        role="button"
                        aria-label={`Delete custom focus ${opt}`}
                        className="delete-chip-btn"
                        onClick={(e) => handleDeleteCustomFocus(e, opt)}
                        style={{
                          marginLeft: "0.25rem",
                          padding: "0 4px",
                          borderRadius: "50%",
                          fontSize: "1.1rem",
                          lineHeight: "1",
                          cursor: "pointer",
                          opacity: 0.75
                        }}
                      >
                        &times;
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {FOCUS_GROUPS.map((group) => (
            <div className="focus-group" key={group.group}>
              <h4>{group.group}</h4>
              <div className="chip-grid">
                {group.options.map((opt) => {
                  const selected = form.focuses?.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={`focus-chip${selected ? " focus-chip-selected" : ""}`}
                      onClick={() => toggleFocus(opt)}
                      aria-pressed={selected}
                    >
                      {selected && <IconCheck width={14} height={14} />}
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="focus-count">
          {(form.focuses || []).length} focus areas selected
        </p>
      </div>
    </div>
  );
}