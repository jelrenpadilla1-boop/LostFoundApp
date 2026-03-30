export const validators = {
  email: (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },
  
  password: (password) => {
    return password.length >= 8;
  },
  
  name: (name) => {
    return name.length >= 2;
  },
  
  phone: (phone) => {
    const regex = /^[0-9+\-\s()]+$/;
    return regex.test(phone);
  },
  
  required: (value) => {
    return value !== null && value !== undefined && value.toString().trim() !== '';
  },
};