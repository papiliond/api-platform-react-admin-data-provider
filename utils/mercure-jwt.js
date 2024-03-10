import axios from '@rc/utils/axios';

export const fetchMercureSecureJwt = async () => {
  try {
    /**
     * Request and set the "mercureAuthorization" cookie, which includes the JWT token
     * for the targets included in "X-Topic" header.
     */
    const { data: topics } = await axios.get('/api/users/discover-mercure');

    window.localStorage.setItem('topics', JSON.stringify(topics));
  } catch (error) {
    console.error(error);
    window.localStorage.setItem('topics', JSON.stringify([]));
  }
};
