import axios from "axios";

//withCredentials sends the session cookie with each request
export const recommendationsApi = axios.create({
  baseURL: "http://localhost:5011/recommendations",
  withCredentials: true,
});

//where an uploaded image is served; the session cookie is sent with <img>
//requests because the frontend and backend are on the same site
export const imageUrl = (id: string) =>
  `${recommendationsApi.defaults.baseURL}/images/${id}`;

//the message the backend sent with a failed request, or the fallback
export function apiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error) && error.response?.data?.error) {
    return error.response.data.error as string;
  }
  return fallback;
}
