const STORAGE_KEY = "cocoloco_live_data";


export function saveData(data) {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(data)
  );

}


export function loadData() {

  const data = localStorage.getItem(
    STORAGE_KEY
  );


  if (!data) {

    return null;

  }


  return JSON.parse(data);

}


export function clearData() {

  localStorage.removeItem(
    STORAGE_KEY
  );

}