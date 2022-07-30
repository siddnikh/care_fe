import loadable from "@loadable/component";
import React, { useState, useCallback, useReducer } from "react";
import { InputLabel, Button } from "@material-ui/core";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import { statusType, useAbortableEffect } from "../../Common/utils";
import {
  GENDER_TYPES,
  PREFERENCE_SIDEBAR_KEY,
  SIDEBAR,
} from "../../Common/constants";
import { useDispatch, useSelector } from "react-redux";
import {
  getUserDetails,
  updateUserDetails,
  updateUserPassword,
} from "../../Redux/actions";
import {
  PhoneNumberField,
  SelectField,
  TextInputField,
} from "../Common/HelperInputFields";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { validateEmailAddress } from "../../Common/validation";
import * as Notification from "../../Utils/Notifications.js";
import { checkIfLatestBundle } from "../../Utils/build-meta-info";
import LanguageSelector from "../../Components/Common/LanguageSelector";
import Switch from "@material-ui/core/Switch";

const Loading = loadable(() => import("../Common/Loading"));

type EditForm = {
  firstName: string;
  lastName: string;
  age: string;
  gender: string;
  email: string;
  phoneNumber: string;
  altPhoneNumber: string;
};
type State = {
  form: EditForm;
  errors: EditForm;
};
type Action =
  | { type: "set_form"; form: EditForm }
  | { type: "set_error"; errors: EditForm };

const genderTypes = [
  {
    id: 0,
    text: "Select",
  },
  ...GENDER_TYPES,
];

const initForm: EditForm = {
  firstName: "",
  lastName: "",
  age: "",
  gender: "",
  email: "",
  phoneNumber: "",
  altPhoneNumber: "",
};

const initError: EditForm = Object.assign(
  {},
  ...Object.keys(initForm).map((k) => ({ [k]: "" }))
);

const initialState: State = {
  form: { ...initForm },
  errors: { ...initError },
};

const editFormReducer = (state: State, action: Action) => {
  switch (action.type) {
    case "set_form": {
      return {
        ...state,
        form: action.form,
      };
    }
    case "set_error": {
      return {
        ...state,
        errors: action.errors,
      };
    }
  }
};
export default function UserProfile() {
  const [states, dispatch] = useReducer(editFormReducer, initialState);
  const reduxDispatch: any = useDispatch();

  const state: any = useSelector((state) => state);
  const { currentUser } = state;
  const username = currentUser.data.username;

  const [changePasswordForm, setChangePasswordForm] = useState<{
    username: string;
    old_password: string;
    new_password_1: string;
    new_password_2: string;
  }>({
    username: username,
    old_password: "",
    new_password_1: "",
    new_password_2: "",
  });

  const [changePasswordErrors] = useState<{
    old_password: string;
    password_confirmation: string;
  }>({
    old_password: "",
    password_confirmation: "",
  });

  const [showEdit, setShowEdit] = useState<boolean | false>(false);
  const [updateBtnText, setUpdateBtnText] = React.useState<string>("Update");

  const [isLoading, setIsLoading] = useState(false);
  const dispatchAction: any = useDispatch();

  const initialDetails: any = [{}];
  const [details, setDetails] = useState(initialDetails);

  const fetchData = useCallback(
    async (status: statusType) => {
      setIsLoading(true);
      const res = await dispatchAction(getUserDetails(username));
      if (!status.aborted) {
        if (res && res.data) {
          setDetails(res.data);
          const formData: EditForm = {
            firstName: res.data.first_name,
            lastName: res.data.last_name,
            age: res.data.age,
            gender: genderTypes
              .filter((el) => {
                return el.text === res.data.gender;
              })[0]
              .id.toString(),
            email: res.data.email,
            phoneNumber: res.data.phone_number,
            altPhoneNumber: res.data.alt_phone_number,
          };
          dispatch({
            type: "set_form",
            form: formData,
          });
        }
        setIsLoading(false);
      }
    },
    [dispatchAction, username]
  );
  useAbortableEffect(
    (status: statusType) => {
      fetchData(status);
    },
    [fetchData]
  );

  const validateForm = () => {
    const errors = { ...initError };
    let invalidForm = false;
    Object.keys(states.form).forEach((field) => {
      switch (field) {
        case "firstName":
        case "lastName":
        case "gender":
          if (!states.form[field] || states.form[field] === "0") {
            errors[field] = "Field is required";
            invalidForm = true;
          }
          return;
        case "age":
          if (!states.form[field]) {
            errors[field] = "This field is required";
            invalidForm = true;
          } else if (
            Number(states.form[field]) <= 0 ||
            !/^\d+$/.test(states.form[field])
          ) {
            errors[field] = "Age must be a number greater than 0";
            invalidForm = true;
          }
          return;
        case "phoneNumber":
          // eslint-disable-next-line no-case-declarations
          const phoneNumber = parsePhoneNumberFromString(
            states.form[field],
            "IN"
          );

          // eslint-disable-next-line no-case-declarations
          let is_valid = false;
          if (phoneNumber) {
            is_valid = phoneNumber.isValid();
          }

          if (!states.form[field] || !is_valid) {
            errors[field] = "Please enter valid phone number";
            invalidForm = true;
          }
          return;
        case "altPhoneNumber":
          // eslint-disable-next-line no-case-declarations
          let alt_is_valid = false;
          if (states.form[field] && states.form[field] !== "+91") {
            const altPhoneNumber = parsePhoneNumberFromString(
              states.form[field],
              "IN"
            );
            if (altPhoneNumber) {
              alt_is_valid = altPhoneNumber.isValid();
            }
          }

          if (
            states.form[field] &&
            states.form[field] !== "+91" &&
            !alt_is_valid
          ) {
            errors[field] = "Please enter valid mobile number";
            invalidForm = true;
          }
          return;
        case "email":
          if (states.form[field] && !validateEmailAddress(states.form[field])) {
            errors[field] = "Enter a valid email address";
            invalidForm = true;
          }
          return;
      }
    });
    dispatch({ type: "set_error", errors });
    return !invalidForm;
  };

  const handleChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const form: EditForm = { ...states.form, [e.target.name]: e.target.value };
    dispatch({ type: "set_form", form });
  };

  const handleValueChange = (phoneNo: string, name: string) => {
    if (phoneNo && parsePhoneNumberFromString(phoneNo)?.isPossible()) {
      const form: EditForm = { ...states.form, [name]: phoneNo };
      dispatch({ type: "set_form", form });
    }
  };

  const handleWhatsappNumChange = (phoneNo: string, name: string) => {
    const form: EditForm = { ...states.form, [name]: phoneNo };
    dispatch({ type: "set_form", form });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validForm = validateForm();
    if (validForm) {
      setIsLoading(true);
      const data = {
        username: username,
        first_name: states.form.firstName,
        last_name: states.form.lastName,
        email: states.form.email,
        phone_number: parsePhoneNumberFromString(
          states.form.phoneNumber
        )?.format("E.164"),
        alt_phone_number:
          parsePhoneNumberFromString(states.form.altPhoneNumber)?.format(
            "E.164"
          ) || "",
        gender: Number(states.form.gender),
        age: states.form.age,
      };
      const res = await dispatchAction(updateUserDetails(username, data));
      setIsLoading(false);
      if (res && res.data) {
        Notification.Success({
          msg: "Details updated successfully",
        });
        setDetails({
          ...details,
          first_name: states.form.firstName,
          last_name: states.form.lastName,
          age: states.form.age,
          gender: genderTypes.filter((el) => {
            return el.id === Number(states.form.gender);
          })[0].text,
          email: states.form.email,
          phone_number: states.form.phoneNumber,
          alt_phone_number: states.form.altPhoneNumber,
        });
        setShowEdit(false);
      }
    }
  };

  const checkForNewBuildVersion = async () => {
    const [isLatestBundle, newVersion] = await checkIfLatestBundle();

    if (!isLatestBundle) {
      setUpdateBtnText("updating...");
      localStorage.setItem("build_meta_version", newVersion);

      if ("caches" in window) {
        // Service worker cache should be cleared with caches.delete()
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name);
          }

          window.location.reload();
        });
      }
    } else {
      setUpdateBtnText("You already have the latest version!");

      setTimeout(() => setUpdateBtnText("Update"), 1000);
    }
  };
  if (isLoading) {
    return <Loading />;
  }

  const changePassword = (e: any) => {
    e.preventDefault();
    //validating form
    if (
      changePasswordForm.new_password_1 != changePasswordForm.new_password_2
    ) {
      Notification.Error({
        msg: "Passwords are different in the new and the confirmation column.",
      });
    } else {
      setIsLoading(true);
      const form = {
        old_password: changePasswordForm.old_password,
        username: username,
        new_password: changePasswordForm.new_password_1,
      };
      reduxDispatch(updateUserPassword(form)).then((resp: any) => {
        setIsLoading(false);
        const res = resp && resp.data;
        if (res.message === "Password updated successfully") {
          Notification.Success({
            msg: "Password changed!",
          });
        } else {
          Notification.Error({
            msg: "There was some error. Please try again in some time.",
          });
        }
        setChangePasswordForm({
          ...changePasswordForm,
          new_password_1: "",
          new_password_2: "",
          old_password: "",
        });
      });
    }
  };
  return (
    <div>
      <div className="md:p-20 p-10">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <div className="px-4 sm:px-0">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Personal Information
              </h3>
              <p className="mt-1 text-sm leading-5 text-gray-600">
                Local Body, District and State are Non Editable Settings.
              </p>
              <button
                onClick={(_) => setShowEdit(!showEdit)}
                type="button"
                className="relative inline-flex items-center px-4 py-2 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-500 focus:outline-none focus:shadow-outline-primary focus:border-primary-700 active:bg-primary-700 mt-4"
              >
                {showEdit ? "Cancel" : "Edit User Profile"}
              </button>
            </div>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            {!showEdit && (
              <div className="px-4 py-5 sm:px-6 bg-white shadow overflow-hidden  sm:rounded-lg m-2 rounded-lg">
                <dl className="grid grid-cols-1 col-gap-4 row-gap-8 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <dt className="text-sm leading-5 font-medium text-gray-500">
                      Username
                    </dt>
                    <dd className="mt-1 text-sm leading-5 text-gray-900">
                      {details.username || "-"}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm leading-5 font-medium text-gray-500">
                      Contact No
                    </dt>
                    <dd className="mt-1 text-sm leading-5 text-gray-900">
                      {details.phone_number || "-"}
                    </dd>
                  </div>

                  <div className="sm:col-span-1">
                    <dt className="text-sm leading-5 font-medium text-gray-500">
                      Whatsapp No
                    </dt>
                    <dd className="mt-1 text-sm leading-5 text-gray-900">
                      {details.alt_phone_number || "-"}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm leading-5 font-medium text-gray-500">
                      Email address
                    </dt>
                    <dd className="mt-1 text-sm leading-5 text-gray-900">
                      {details.email || "-"}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm leading-5 font-medium text-gray-500">
                      First Name
                    </dt>
                    <dd className="mt-1 text-sm leading-5 text-gray-900">
                      {details.first_name || "-"}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm leading-5 font-medium text-gray-500">
                      Last Name
                    </dt>
                    <dd className="mt-1 text-sm leading-5 text-gray-900">
                      {details.last_name || "-"}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm leading-5 font-medium text-gray-500">
                      Age
                    </dt>
                    <dd className="mt-1 text-sm leading-5 text-gray-900">
                      {details.age || "-"}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm leading-5 font-medium text-gray-500">
                      Verification Status
                    </dt>
                    {details.verified && (
                      <dd className="mt-1 badge badge-pill badge-primary text-sm leading-5 text-gray-900">
                        Verified
                      </dd>
                    )}
                    {!details.verified && (
                      <dd className="mt-1 text-sm leading-5 text-gray-900">
                        Not Verified
                      </dd>
                    )}
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm leading-5 font-medium text-gray-500">
                      Access Level
                    </dt>
                    <dd className="mt-1 badge badge-pill badge-primary text-sm leading-5 text-gray-900">
                      {details.user_type || "-"}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm leading-5 font-medium text-gray-500">
                      Gender
                    </dt>
                    <dd className="mt-1 text-sm leading-5 text-gray-900">
                      {details.gender || "-"}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm leading-5 font-medium text-gray-500">
                      Local Body
                    </dt>
                    <dd className="mt-1 text-sm leading-5 text-gray-900">
                      {details.local_body_object?.name || "-"}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm leading-5 font-medium text-gray-500">
                      District
                    </dt>
                    <dd className="mt-1 text-sm leading-5 text-gray-900">
                      {details.district_object?.name || "-"}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm leading-5 font-medium text-gray-500">
                      State
                    </dt>
                    <dd className="mt-1 text-sm leading-5 text-gray-900">
                      {details.state_object?.name || "-"}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {showEdit && (
              <div>
                <form action="#" method="POST">
                  <div className="shadow overflow-hidden sm:rounded-md">
                    <div className="px-4 py-5 bg-white sm:p-6">
                      <div className="grid grid-cols-6 gap-6">
                        <div className="col-span-6 sm:col-span-3">
                          <label
                            htmlFor="firstName"
                            className="block text-sm font-medium leading-5 text-gray-700"
                          >
                            First name*
                          </label>
                          <TextInputField
                            name="firstName"
                            variant="outlined"
                            margin="dense"
                            type="text"
                            className="mt-1 form-input block w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:shadow-outline-blue focus:border-blue-300 transition duration-150 ease-in-out sm:text-sm sm:leading-5"
                            value={states.form.firstName}
                            onChange={handleChangeInput}
                            errors={states.errors.firstName}
                          />
                        </div>

                        <div className="col-span-6 sm:col-span-3">
                          <label
                            htmlFor="lastName"
                            className="block text-sm font-medium leading-5 text-gray-700"
                          >
                            Last name*
                          </label>
                          <TextInputField
                            name="lastName"
                            variant="outlined"
                            margin="dense"
                            className="mt-1 form-input block w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:shadow-outline-blue focus:border-blue-300 transition duration-150 ease-in-out sm:text-sm sm:leading-5"
                            type="text"
                            value={states.form.lastName}
                            onChange={handleChangeInput}
                            errors={states.errors.lastName}
                          />
                        </div>

                        <div className="col-span-6 sm:col-span-3">
                          <label
                            htmlFor="age"
                            className="block text-sm font-medium leading-5 text-gray-700"
                          >
                            Age*
                          </label>
                          <TextInputField
                            name="age"
                            className="mt-1 form-input block w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:shadow-outline-blue focus:border-blue-300 transition duration-150 ease-in-out sm:text-sm sm:leading-5"
                            variant="outlined"
                            margin="dense"
                            value={states.form.age}
                            onChange={handleChangeInput}
                            errors={states.errors.age}
                          />
                        </div>

                        <div className="col-span-6 sm:col-span-3">
                          <label
                            htmlFor="gender"
                            className="block text-sm font-medium leading-5 text-gray-700"
                          >
                            Gender*
                          </label>
                          <SelectField
                            name="gender"
                            variant="outlined"
                            margin="dense"
                            value={states.form.gender}
                            options={genderTypes}
                            onChange={handleChangeInput}
                            errors={states.errors.gender}
                          />
                        </div>

                        <div className="col-span-6 sm:col-span-3">
                          <PhoneNumberField
                            label="Phone Number*"
                            value={states.form.phoneNumber}
                            onChange={(value: string) =>
                              handleValueChange(value, "phoneNumber")
                            }
                            errors={states.errors.phoneNumber}
                          />
                        </div>

                        <div className="col-span-6 sm:col-span-3">
                          <PhoneNumberField
                            name="altPhoneNumber"
                            label="Whatsapp Number"
                            value={states.form.altPhoneNumber}
                            onChange={(value: string) =>
                              handleWhatsappNumChange(value, "altPhoneNumber")
                            }
                            errors={states.errors.altPhoneNumber}
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-3">
                          <InputLabel id="email-label">Email</InputLabel>
                          <TextInputField
                            name="email"
                            variant="outlined"
                            margin="dense"
                            type="text"
                            value={states.form.email}
                            onChange={handleChangeInput}
                            errors={states.errors.email}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                      <Button
                        color="primary"
                        variant="contained"
                        type="submit"
                        style={{ marginLeft: "auto" }}
                        startIcon={
                          <CheckCircleOutlineIcon>save</CheckCircleOutlineIcon>
                        }
                        onClick={(e) => handleSubmit(e)}
                      >
                        {" "}
                        UPDATE{" "}
                      </Button>
                    </div>
                  </div>
                </form>
                <form action="#" method="POST">
                  <div className="shadow overflow-hidden sm:rounded-md">
                    <div className="px-4 py-5 bg-white sm:p-6">
                      <div className="grid grid-cols-6 gap-6">
                        <div className="col-span-6 sm:col-span-3">
                          <label
                            htmlFor="old_password"
                            className="block text-sm font-medium leading-5 text-gray-700"
                          >
                            Current Password*
                          </label>
                          <TextInputField
                            name="old_password"
                            variant="outlined"
                            margin="dense"
                            type="password"
                            className="mt-1 form-input block w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:shadow-outline-blue focus:border-blue-300 transition duration-150 ease-in-out sm:text-sm sm:leading-5"
                            value={changePasswordForm.old_password}
                            onChange={(e) =>
                              setChangePasswordForm({
                                ...changePasswordForm,
                                old_password: e.target.value,
                              })
                            }
                            errors={changePasswordErrors.old_password}
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-3">
                          <label
                            htmlFor="new_password_1"
                            className="block text-sm font-medium leading-5 text-gray-700"
                          >
                            New Password*
                          </label>
                          <TextInputField
                            name="new_password_1"
                            variant="outlined"
                            margin="dense"
                            type="password"
                            className="mt-1 form-input block w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:shadow-outline-blue focus:border-blue-300 transition duration-150 ease-in-out sm:text-sm sm:leading-5"
                            value={changePasswordForm.new_password_1}
                            onChange={(e) =>
                              setChangePasswordForm({
                                ...changePasswordForm,
                                new_password_1: e.target.value,
                              })
                            }
                            errors=""
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-3">
                          <label
                            htmlFor="new_password_2"
                            className="block text-sm font-medium leading-5 text-gray-700"
                          >
                            New Password Confirmation*
                          </label>
                          <TextInputField
                            name="new_password_2"
                            variant="outlined"
                            margin="dense"
                            type="password"
                            className="mt-1 form-input block w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:shadow-outline-blue focus:border-blue-300 transition duration-150 ease-in-out sm:text-sm sm:leading-5"
                            value={changePasswordForm.new_password_2}
                            onChange={(e) =>
                              setChangePasswordForm({
                                ...changePasswordForm,
                                new_password_2: e.target.value,
                              })
                            }
                            errors={changePasswordErrors.password_confirmation}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                      <Button
                        color="primary"
                        variant="contained"
                        type="submit"
                        style={{ marginLeft: "auto" }}
                        startIcon={
                          <CheckCircleOutlineIcon>save</CheckCircleOutlineIcon>
                        }
                        onClick={(e) => changePassword(e)}
                      >
                        {" "}
                        CHANGE PASSWORD{" "}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        <div className="md:grid md:grid-cols-3 md:gap-6 mt-6 mb-8">
          <div className="md:col-span-1">
            <div className="px-4 sm:px-0">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Language Selection
              </h3>
              <p className="mt-1 text-sm leading-5 text-gray-600">
                Set your local language
              </p>
            </div>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <LanguageSelector className="bg-white w-full" />
          </div>
        </div>
        <div>
          <h1 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Preferences
          </h1>
          <div className="flex items-center gap-8">
            <h1 className="text-base font-normal leading-6 text-gray-900">
              Auto Collapse Sidebar
            </h1>
            <Switch
              color="primary"
              value={
                localStorage.getItem(PREFERENCE_SIDEBAR_KEY) ===
                SIDEBAR.COLLAPSED
              }
              onChange={(e) => {
                localStorage.setItem(
                  PREFERENCE_SIDEBAR_KEY,
                  e.target.checked ? SIDEBAR.COLLAPSED : SIDEBAR.FULL
                );
                window.dispatchEvent(new Event("storage"));
              }}
              defaultChecked={
                localStorage.getItem(PREFERENCE_SIDEBAR_KEY) ===
                SIDEBAR.COLLAPSED
              }
            />
          </div>
        </div>

        <div className="mt-10">
          <div className="text-lg font-medium leading-6 text-gray-900">
            Check for software updates
            <p className="mt-1 text-sm leading-5 text-gray-600">
              Click the update button to see if you have the latest
              &quot;care&quot; version.
            </p>
          </div>
          <button
            className="bg-white text-sm hover:bg-gray-100 text-gray-800 py-2 px-4 border border-gray-400 rounded shadow text-center outline-none mt-3"
            onClick={() => checkForNewBuildVersion()}
          >
            {updateBtnText}
          </button>
        </div>
      </div>
    </div>
  );
}
