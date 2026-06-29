"use client";

import React, { useState, useEffect } from "react";
import { ScreenHeader, Field } from "../Layout";
import { ActionButton } from "../ActionButton";
import { IconCheck } from "../icons";
import { FOCUS_GROUPS, ALL_FOCUS_OPTIONS } from "../../data/mockData";
// import "../../styles/Profile.css";

/* ============================================================
   ORGANIZATION PROFILE SCREEN
   The org's information lives here and feeds both the grant
   discovery/ranking step and the proposal-writing step. This
   is the only screen with form validation, since everything
   downstream depends on this data being usable.
   ============================================================ */

export function ProfileScreen({ profile, setProfile, onSaved }) {
  const [form, setForm] = useState(profile);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(profile);
    setDirty(false);
  }, [profile]);

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setDirty(true);
  };

  const toggleFocus = (option) => {
    setForm((f) => {
      const has = f.focuses.includes(option);
      return { ...f, focuses: has ? f.focuses.filter((x) => x !== option) : [...f.focuses, option] };
    });
    setDirty(true);
  };

  const validate = () => {
    const errs = {};
    if (!form.orgName.trim()) errs.orgName = "Enter your organization's name.";
    if (!form.yearFounded || isNaN(Number(form.yearFounded))) errs.yearFounded = "Enter a 4-digit year.";
    if (!form.employees || isNaN(Number(form.employees))) errs.employees = "Enter a number.";
    if (form.focuses.length === 0) errs.focuses = "Select at least one focus area.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      throw new Error("validation");
    }
    await new Promise((r) => setTimeout(r, 900));
    setProfile(form);
    setDirty(false);
    onSaved();
  };

  const yearsActive =
    form.yearFounded && !isNaN(Number(form.yearFounded)) ? new Date().getFullYear() - Number(form.yearFounded) : null;

  return (
    <div className="screen">
      <ScreenHeader
        title="Organization profile"
        subtitle="This information is sent to the AI when finding and ranking grants, and when writing proposal drafts. The more complete it is, the better the matches and drafts will be."
      />

      <div className="panel">
        <h3 className="panel-title">Basic information</h3>
        <div className="form-grid">
          <Field label="Organization name" error={errors.orgName} htmlFor="orgName">
            <input
              id="orgName"
              type="text"
              value={form.orgName}
              onChange={(e) => update("orgName", e.target.value)}
              placeholder="e.g. Lengua Viva Language & Cultural Center"
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
              value={form.yearFounded}
              onChange={(e) => update("yearFounded", e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="e.g. 2014"
            />
          </Field>
          <Field label="Number of employees" error={errors.employees} htmlFor="employees">
            <input
              id="employees"
              type="text"
              inputMode="numeric"
              value={form.employees}
              onChange={(e) => update("employees", e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="e.g. 8"
            />
          </Field>
          <Field label="Annual income" htmlFor="annualIncome" hint="Used to match grants to your funding scale">
            <div className="input-prefixed">
              <span>$</span>
              <input
                id="annualIncome"
                type="text"
                inputMode="numeric"
                value={form.annualIncome}
                onChange={(e) => update("annualIncome", e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="e.g. 310000"
              />
            </div>
          </Field>
          <Field label="Service area" htmlFor="serviceArea" wide>
            <input
              id="serviceArea"
              type="text"
              value={form.serviceArea}
              onChange={(e) => update("serviceArea", e.target.value)}
              placeholder="e.g. Prince William County, VA and surrounding areas"
            />
          </Field>
          <Field
            label="Mission and values"
            htmlFor="mission"
            wide
            hint="A short paragraph the AI uses to understand your organization's priorities"
          >
            <textarea
              id="mission"
              rows={4}
              value={form.mission}
              onChange={(e) => update("mission", e.target.value)}
              placeholder="Describe who you serve and why your work matters…"
            />
          </Field>
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-title">Grant focus areas</h3>
        <p className="panel-desc">
          Select every area that matches what your organization does. The AI uses these to find and rank grants —
          the more precise this list, the better your matches.
        </p>
        {errors.focuses && (
          <p className="field-error" role="alert">
            {errors.focuses}
          </p>
        )}
        <div className="focus-groups">
          {FOCUS_GROUPS.map((group) => (
            <div className="focus-group" key={group.group}>
              <h4>{group.group}</h4>
              <div className="chip-grid">
                {group.options.map((opt) => {
                  const selected = form.focuses.includes(opt);
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
          {form.focuses.length} of {ALL_FOCUS_OPTIONS.length} focus areas selected
        </p>
      </div>

      <div className="save-bar">
        {dirty && <span className="save-bar-hint">You have unsaved changes</span>}
        <ActionButton onPress={handleSave} busyText="Saving…" variant="primary" size="lg" icon={<IconCheck width={18} height={18} />}>
          Save profile
        </ActionButton>
      </div>
    </div>
  );
}
