export interface YouTubeMetadata {
  title: string;
  thumbnail: string;
  channelName: string;
  channelAvatar?: string;
  subscriberCount?: string;
  error?: string;
}

export class YouTubeService {
  private static readonly OEMBED_BASE_URL = 'https://www.youtube.com/oembed';

  static async getMetadata(videoId: string): Promise<YouTubeMetadata> {
    try {
      const url = `${this.OEMBED_BASE_URL}?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.title) {
        throw new Error('Invalid response from YouTube oEmbed API');
      }

      // Extract channel name from author_name or author_url
      const channelName = data.author_name || 'Unknown Channel';

      // Try to get channel avatar from author_url if available
      let channelAvatar: string | undefined;
      if (data.author_url) {
        try {
          // Extract channel ID from author_url and construct avatar URL
          const channelMatch = data.author_url.match(/\/channel\/([^\/]+)/);
          if (channelMatch) {
            channelAvatar = `https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj`;
          }
        } catch (error) {
          // If we can't get avatar, continue without it
          console.warn('Could not extract channel avatar:', error);
        }
      }

      return {
        title: data.title,
        thumbnail: data.thumbnail_url,
        channelName,
        channelAvatar,
      };
    } catch (error) {
      console.error('Error fetching YouTube metadata:', error);
      return {
        title: '',
        thumbnail: '',
        channelName: '',
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

   
  static async getChannelInfo(
    _channelUrl: string
  ): Promise<{ subscriberCount?: string }> {
    try {
      // Note: YouTube doesn't provide subscriber count via public APIs without authentication
      // This is a placeholder for future implementation
      // For now, we'll return undefined and ask users to provide this info manually
      return {};
    } catch (error) {
      console.error('Error fetching channel info:', error);
      return {};
    }
  }
}
