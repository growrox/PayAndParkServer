
export const isEmpty = (value) => {
     if (value === null || value === undefined) {
          return true;
     } else if (typeof value === 'object') {
          return Object.keys(value).length === 0;
     } else if (Array.isArray(value)) {
          return value.length === 0;
     } else if (typeof value === 'string') {
          return value.trim() === '';
     } else {
          return false;
     }

}