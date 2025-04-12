
export const getCurrentDateParts = () => {
    const now = new Date();
    return {
        year: now.getFullYear().toString(),
        month: (now.getMonth() + 1).toString().padStart(2, '0'),
        day: now.getDate().toString().padStart(2, '0'),
    };
};