import { Alert as NativeAlert } from "react-native";

let alertHandler = null;

export const setAlertHandler = (handler) => {
  alertHandler = handler;
};

export const Alert = {
  alert: (title, message, buttons, options) => {
    if (typeof alertHandler === "function") {
      alertHandler(title, message, buttons, options);
      return;
    }
    NativeAlert.alert(title, message, buttons, options);
  },
};

