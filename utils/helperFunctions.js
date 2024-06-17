export const isEmpty = (value) => {
  if (value === null || value === undefined) {
    return true;
  } else if (typeof value === "object") {
    return Object.keys(value).length === 0;
  } else if (Array.isArray(value)) {
    return value.length === 0;
  } else if (typeof value === "string") {
    return value.trim() === "";
  } else {
    return false;
  }
};

export const generateCode = (length = 6) => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};
