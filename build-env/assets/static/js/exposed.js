function emit(event, data) {
  return axios.post(`/emit/${event}`, data);
}
