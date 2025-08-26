import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Calendar as CalendarIcon,
  X as XIcon,
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Save,
  AlertCircle,
} from "lucide-react";

/** ---------- small utils ---------- */
const empty = {
  id: "",
  email: "",
  first_name: "",
  last_name: "",
  phone_number: "",
  gender: "",
  date_of_birth: "", // keep as "YYYY-MM-DD" string or ""
  address: "",
  avatar: "",
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeYYYYMMDD(s) {
  if (!s) return "";
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const [_, Y, M, D] = m;
  const year = Number(Y);
  const month = Number(M);
  const day = Number(D);
  if (month < 1 || month > 12) return "";
  if (day < 1 || day > 31) return "";
  if (year < 1900) return "";
  return `${Y}-${M}-${D}`;
}

function formatDisplayDate(dateString) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export default function ProfilePage() {
  const API = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");
  const { toast } = useToast();

  const [data, setData] = useState(empty);
  const [initial, setInitial] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/api/auth/profile/`, { headers });
        if (!res.ok) throw new Error(`GET failed: ${res.status}`);
        const json = await res.json();
        const normalized = {
          ...empty,
          ...json,
          date_of_birth: normalizeYYYYMMDD(json.date_of_birth) || "",
        };
        if (alive) {
          setData(normalized);
          setInitial(normalized);
        }
      } catch (e) {
        toast({
          title: "Could not load profile",
          description: e.message || "Please log in again.",
          variant: "destructive",
        });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [API, headers, toast]);

  const onChange = (k) => (e) =>
    setData((s) => ({ ...s, [k]: e.target.value }));

  const diff = React.useMemo(() => {
    const d = {};
    for (const k of Object.keys(data)) {
      if (data[k] !== initial[k]) d[k] = data[k] ?? null;
    }
    delete d.email;
    delete d.id;
    if ("date_of_birth" in d) d.date_of_birth = d.date_of_birth || null;
    return d;
  }, [data, initial]);

  const hasChanges = Object.keys(diff).length > 0;

  const save = async () => {
    if (!hasChanges) return;
    try {
      setSaving(true);
      const res = await fetch(`${API}/api/auth/profile/`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(diff),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`PATCH failed: ${res.status} ${t}`);
      }
      const json = await res.json();
      const normalized = {
        ...empty,
        ...json,
        date_of_birth: normalizeYYYYMMDD(json.date_of_birth) || "",
      };
      setData(normalized);
      setInitial(normalized);
      toast({
        title: "✅ Profile saved",
        description: "Your changes have been successfully updated.",
      });
    } catch (e) {
      toast({
        title: "❌ Save failed",
        description: e.message || "Please check your inputs and try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Profile Access Required
          </h1>
          <p className="text-gray-600 mb-6">
            You need to be signed in to view and edit your profile information.
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700">Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <User className="h-8 w-8 text-blue-600" />
                Your Profile
              </h1>
              <p className="mt-2 text-gray-600">
                Manage your personal information and account settings
              </p>
            </div>

            {hasChanges && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  Unsaved changes
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <SkeletonCard />
          ) : (
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Email (Read-only) */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <Field
                      label="Email Address"
                      icon={<Mail className="h-4 w-4" />}
                    >
                      <Input
                        value={data.email}
                        disabled
                        className="bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                      <Hint>
                        Your email address is used for login and cannot be
                        changed
                      </Hint>
                    </Field>
                  </div>

                  {/* Name Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Field
                      label="First Name"
                      icon={<User className="h-4 w-4" />}
                    >
                      <Input
                        placeholder="Enter your first name"
                        value={data.first_name}
                        onChange={onChange("first_name")}
                        className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </Field>

                    <Field
                      label="Last Name"
                      icon={<User className="h-4 w-4" />}
                    >
                      <Input
                        placeholder="Enter your last name"
                        value={data.last_name}
                        onChange={onChange("last_name")}
                        className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </Field>
                  </div>

                  {/* Phone */}
                  <Field
                    label="Phone Number"
                    icon={<Phone className="h-4 w-4" />}
                  >
                    <Input
                      placeholder="+1 (555) 123-4567"
                      value={data.phone_number}
                      onChange={onChange("phone_number")}
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <Hint>Include country code for international numbers</Hint>
                  </Field>

                  {/* Gender & Birthday */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Field label="Gender">
                      <CustomSelect
                        value={data.gender || ""}
                        onChange={onChange("gender")}
                        options={[
                          { value: "", label: "Select gender" },
                          { value: "male", label: "Male" },
                          { value: "female", label: "Female" },
                          { value: "other", label: "Other" },
                        ]}
                      />
                    </Field>

                    <Field
                      label="Date of Birth"
                      icon={<CalendarIcon className="h-4 w-4" />}
                    >
                      <DateField
                        value={data.date_of_birth}
                        onChange={(val) =>
                          setData((s) => ({ ...s, date_of_birth: val }))
                        }
                        max={todayISO()}
                      />
                    </Field>
                  </div>

                  {/* Address */}
                  <Field label="Address" icon={<MapPin className="h-4 w-4" />}>
                    <Textarea
                      placeholder="Enter your full address including street, city, state, and postal code"
                      value={data.address}
                      onChange={onChange("address")}
                      rows={3}
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 resize-none"
                    />
                  </Field>
                </div>

                {/* Avatar Section */}
                <div className="lg:col-span-1">
                  <div className="sticky top-8">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <Camera className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            Profile Photo
                          </h3>
                        </div>

                        {/* Avatar Preview */}
                        <div className="mb-6 flex justify-center">
                          {data.avatar && !avatarError ? (
                            <div className="relative group">
                              <img
                                src={data.avatar}
                                alt="Profile avatar"
                                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                                onError={() => setAvatarError(true)}
                              />
                              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  Preview
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-white shadow-lg flex items-center justify-center">
                              <User className="h-12 w-12 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Avatar URL Input */}
                        <div className="space-y-3">
                          <Input
                            placeholder="Paste image URL here..."
                            value={data.avatar}
                            onChange={(e) => {
                              setAvatarError(false);
                              onChange("avatar")(e);
                            }}
                            className="text-center"
                          />
                          <p className="text-xs text-gray-600">
                            Paste a URL to an image (JPG, PNG, GIF)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="border-t border-gray-200 bg-gray-50 px-8 py-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    {hasChanges ? (
                      <span className="flex items-center gap-2 text-amber-600">
                        <AlertCircle className="h-4 w-4" />
                        You have unsaved changes
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-green-600">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        All changes saved
                      </span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setData(initial);
                        setAvatarError(false);
                      }}
                      disabled={!hasChanges || saving}
                      className="px-6"
                    >
                      Reset
                    </Button>

                    <Button
                      type="button"
                      onClick={save}
                      disabled={saving || !hasChanges}
                      className="bg-blue-600 hover:bg-blue-700 px-8"
                    >
                      {saving ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          Save Changes
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/** ---------- Enhanced UI Components ---------- */

function Field({ label, children, icon }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        {icon && <span className="text-gray-500">{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  );
}

function Hint({ children }) {
  return (
    <p className="text-xs text-gray-500 flex items-start gap-1 mt-1">
      <span className="text-blue-500 mt-0.5">ℹ</span>
      {children}
    </p>
  );
}

function CustomSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full h-11 px-3 bg-white border border-gray-200 rounded-lg text-sm transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function SkeletonCard() {
  return (
    <div className="p-8 space-y-8">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="space-y-2">
          <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-48 h-4 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Form field skeletons */}
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-2">
              <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-full h-11 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse"></div>
            <div className="w-full h-11 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------- Simple Working Date Field ---------- */
function DateField({ value, onChange, max }) {
  const [inputValue, setInputValue] = useState(value || "");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const normalized = normalizeYYYYMMDD(inputValue);
  const isEmpty = inputValue === "";
  const isValid = isEmpty || !!normalized;
  const maxOk = !max || !normalized || normalized <= max;
  const showError = touched && (!isValid || !maxOk);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Immediately update parent with normalized value
    const norm = normalizeYYYYMMDD(newValue) || "";
    onChange(norm);
  };

  const handleBlur = () => {
    setTouched(true);
    const norm = normalizeYYYYMMDD(inputValue) || "";
    setInputValue(norm);
    onChange(norm);
  };

  const clear = () => {
    setInputValue("");
    onChange("");
    setTouched(false);
  };

  return (
    <div className="relative">
      <div
        className={`
          relative flex items-center w-full h-11 bg-white border rounded-lg transition-all duration-200 
          ${
            showError
              ? "border-red-300 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20"
              : "border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 hover:border-gray-300"
          }
        `}
      >
        {/* Calendar icon */}
        <div className="absolute left-3 flex items-center pointer-events-none z-10">
          <CalendarIcon className="h-4 w-4 text-gray-400" />
        </div>

        {/* Native date input - styled properly */}
        <input
          type="date"
          value={inputValue}
          max={max}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="YYYY-MM-DD"
          className={`
            w-full h-full pl-10 pr-10 bg-transparent border-none outline-none text-sm rounded-lg
            ${inputValue ? "text-gray-900" : "text-gray-400"}
            focus:ring-0
          `}
          style={{
            colorScheme: "light",
          }}
        />

        {/* Clear button */}
        {inputValue && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              clear();
            }}
            className="absolute right-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-150 z-10"
            title="Clear date"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Error message */}
      {showError && (
        <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>
            {!isValid && "Please enter a valid date (YYYY-MM-DD)"}
            {isValid && !maxOk && `Date cannot be after ${max}`}
          </span>
        </div>
      )}

      {/* Success indicator */}
      {!showError && !isEmpty && normalized && (
        <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
          <span className="w-1 h-1 bg-green-500 rounded-full"></span>
          Valid date: {formatDisplayDate(normalized)}
        </div>
      )}
    </div>
  );
}
