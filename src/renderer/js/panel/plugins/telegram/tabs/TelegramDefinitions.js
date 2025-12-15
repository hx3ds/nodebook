export const TelegramMethods = {
    getMe: {
        description: 'A simple method for testing your bot\'s auth token.',
        params: []
    },
    getUpdates: {
        description: 'Receive incoming updates using long polling.',
        params: [
            { name: 'offset', type: 'number', description: 'Identifier of the first update to be returned.' },
            { name: 'limit', type: 'number', description: 'Limits the number of updates to be retrieved.' },
            { name: 'timeout', type: 'number', description: 'Timeout in seconds for long polling.' },
            { name: 'allowed_updates', type: 'json', description: 'A JSON-serialized list of the update types you want your bot to receive.' }
        ]
    },
    setWebhook: {
        description: 'Specify a url and receive incoming updates via an outgoing webhook.',
        params: [
            { name: 'url', required: true, description: 'HTTPS url to send updates to.' },
            { name: 'certificate', type: 'file', description: 'Upload your public key certificate so that the root certificate in use can be checked.' },
            { name: 'ip_address', description: 'The fixed IP address which will be used to send webhook requests.' },
            { name: 'max_connections', type: 'number', description: 'Maximum allowed number of simultaneous HTTPS connections to the webhook for update delivery.' },
            { name: 'allowed_updates', type: 'json', description: 'A JSON-serialized list of the update types you want your bot to receive.' },
            { name: 'drop_pending_updates', type: 'boolean', description: 'Pass True to drop all pending updates.' },
            { name: 'secret_token', description: 'A secret token to be sent in a header “X-Telegram-Bot-Api-Secret-Token” in every webhook request.' }
        ]
    },
    deleteWebhook: {
        description: 'Remove webhook integration if you decide to switch back to getUpdates.',
        params: [
            { name: 'drop_pending_updates', type: 'boolean', description: 'Pass True to drop all pending updates.' }
        ]
    },
    getWebhookInfo: {
        description: 'Get current webhook status.',
        params: []
    },
    sendMessage: {
        description: 'Send text messages.',
        params: [
            { name: 'chat_id', required: true, description: 'Unique identifier for the target chat or username of the target channel (in the format @channelusername).' },
            { name: 'text', required: true, type: 'textarea', description: 'Text of the message to be sent, 1-4096 characters after entities parsing.' },
            { name: 'parse_mode', type: 'select', options: ['MarkdownV2', 'HTML', 'Markdown'], description: 'Mode for parsing entities in the message text.' },
            { name: 'entities', type: 'json', description: 'A JSON-serialized list of special entities that appear in message text.' },
            { name: 'disable_web_page_preview', type: 'boolean', description: 'Disables link previews for links in this message.' },
            { name: 'disable_notification', type: 'boolean', description: 'Sends the message silently. Users will receive a notification with no sound.' },
            { name: 'protect_content', type: 'boolean', description: 'Protects the contents of the sent message from forwarding and saving.' },
            { name: 'reply_to_message_id', type: 'number', description: 'If the message is a reply, ID of the original message.' },
            { name: 'allow_sending_without_reply', type: 'boolean', description: 'Pass True if the message should be sent even if the specified replied-to message is not found.' },
            { name: 'reply_markup', type: 'json', description: 'Additional interface options. A JSON-serialized object.' }
        ]
    },
    forwardMessage: {
        description: 'Forward messages of any kind.',
        params: [
            { name: 'chat_id', required: true, description: 'Unique identifier for the target chat or username of the target channel.' },
            { name: 'from_chat_id', required: true, description: 'Unique identifier for the chat where the original message was sent.' },
            { name: 'message_id', required: true, type: 'number', description: 'Message identifier in the chat specified in from_chat_id.' },
            { name: 'disable_notification', type: 'boolean', description: 'Sends the message silently.' },
            { name: 'protect_content', type: 'boolean', description: 'Protects the contents of the forwarded message from forwarding and saving.' }
        ]
    },
    sendPhoto: {
        description: 'Send photos.',
        params: [
            { name: 'chat_id', required: true, description: 'Unique identifier for the target chat or username of the target channel.' },
            { name: 'photo', required: true, description: 'Photo to send. Pass a file_id as String to send a photo that exists on the Telegram servers, or a HTTP URL as a String for Telegram to get a photo from the Internet.' },
            { name: 'caption', description: 'Photo caption (may also be used when resending photos by file_id), 0-1024 characters after entities parsing.' },
            { name: 'parse_mode', type: 'select', options: ['MarkdownV2', 'HTML', 'Markdown'], description: 'Mode for parsing entities in the photo caption.' },
            { name: 'has_spoiler', type: 'boolean', description: 'Pass True if the photo needs to be covered with a spoiler animation.' },
            { name: 'disable_notification', type: 'boolean', description: 'Sends the message silently.' },
            { name: 'protect_content', type: 'boolean', description: 'Protects the contents of the sent message from forwarding and saving.' },
            { name: 'reply_to_message_id', type: 'number', description: 'If the message is a reply, ID of the original message.' },
            { name: 'reply_markup', type: 'json', description: 'Additional interface options.' }
        ]
    },
    sendAudio: {
        description: 'Send audio files.',
        params: [
            { name: 'chat_id', required: true, description: 'Unique identifier for the target chat or username of the target channel.' },
            { name: 'audio', required: true, description: 'Audio file to send. Pass a file_id, or a HTTP URL.' },
            { name: 'caption', description: 'Audio caption, 0-1024 characters after entities parsing.' },
            { name: 'parse_mode', type: 'select', options: ['MarkdownV2', 'HTML', 'Markdown'], description: 'Mode for parsing entities in the audio caption.' },
            { name: 'duration', type: 'number', description: 'Duration of the audio in seconds.' },
            { name: 'performer', description: 'Performer.' },
            { name: 'title', description: 'Track name.' },
            { name: 'disable_notification', type: 'boolean', description: 'Sends the message silently.' },
            { name: 'protect_content', type: 'boolean', description: 'Protects the contents of the sent message from forwarding and saving.' },
            { name: 'reply_to_message_id', type: 'number', description: 'If the message is a reply, ID of the original message.' },
            { name: 'reply_markup', type: 'json', description: 'Additional interface options.' }
        ]
    },
    sendDocument: {
        description: 'Send general files.',
        params: [
            { name: 'chat_id', required: true, description: 'Unique identifier for the target chat or username of the target channel.' },
            { name: 'document', required: true, description: 'File to send. Pass a file_id, or a HTTP URL.' },
            { name: 'caption', description: 'Document caption, 0-1024 characters after entities parsing.' },
            { name: 'parse_mode', type: 'select', options: ['MarkdownV2', 'HTML', 'Markdown'], description: 'Mode for parsing entities in the document caption.' },
            { name: 'disable_content_type_detection', type: 'boolean', description: 'Disables automatic server-side content type detection.' },
            { name: 'disable_notification', type: 'boolean', description: 'Sends the message silently.' },
            { name: 'protect_content', type: 'boolean', description: 'Protects the contents of the sent message from forwarding and saving.' },
            { name: 'reply_to_message_id', type: 'number', description: 'If the message is a reply, ID of the original message.' },
            { name: 'reply_markup', type: 'json', description: 'Additional interface options.' }
        ]
    },
    sendVideo: {
        description: 'Send video files.',
        params: [
            { name: 'chat_id', required: true, description: 'Unique identifier for the target chat or username of the target channel.' },
            { name: 'video', required: true, description: 'Video to send. Pass a file_id, or a HTTP URL.' },
            { name: 'duration', type: 'number', description: 'Duration of sent video in seconds.' },
            { name: 'width', type: 'number', description: 'Video width.' },
            { name: 'height', type: 'number', description: 'Video height.' },
            { name: 'caption', description: 'Video caption, 0-1024 characters after entities parsing.' },
            { name: 'parse_mode', type: 'select', options: ['MarkdownV2', 'HTML', 'Markdown'], description: 'Mode for parsing entities in the video caption.' },
            { name: 'has_spoiler', type: 'boolean', description: 'Pass True if the video needs to be covered with a spoiler animation.' },
            { name: 'supports_streaming', type: 'boolean', description: 'Pass True if the uploaded video is suitable for streaming.' },
            { name: 'disable_notification', type: 'boolean', description: 'Sends the message silently.' },
            { name: 'protect_content', type: 'boolean', description: 'Protects the contents of the sent message from forwarding and saving.' },
            { name: 'reply_to_message_id', type: 'number', description: 'If the message is a reply, ID of the original message.' },
            { name: 'reply_markup', type: 'json', description: 'Additional interface options.' }
        ]
    },
    sendAnimation: {
        description: 'Send animation files (GIF or H.264/MPEG-4 AVC video without sound).',
        params: [
            { name: 'chat_id', required: true, description: 'Unique identifier for the target chat or username of the target channel.' },
            { name: 'animation', required: true, description: 'Animation to send. Pass a file_id, or a HTTP URL.' },
            { name: 'duration', type: 'number', description: 'Duration of sent animation in seconds.' },
            { name: 'width', type: 'number', description: 'Animation width.' },
            { name: 'height', type: 'number', description: 'Animation height.' },
            { name: 'caption', description: 'Animation caption, 0-1024 characters after entities parsing.' },
            { name: 'parse_mode', type: 'select', options: ['MarkdownV2', 'HTML', 'Markdown'], description: 'Mode for parsing entities in the animation caption.' },
            { name: 'has_spoiler', type: 'boolean', description: 'Pass True if the animation needs to be covered with a spoiler animation.' },
            { name: 'disable_notification', type: 'boolean', description: 'Sends the message silently.' },
            { name: 'protect_content', type: 'boolean', description: 'Protects the contents of the sent message from forwarding and saving.' },
            { name: 'reply_to_message_id', type: 'number', description: 'If the message is a reply, ID of the original message.' },
            { name: 'reply_markup', type: 'json', description: 'Additional interface options.' }
        ]
    },
    sendVoice: {
        description: 'Send audio files, if you want Telegram clients to display the file as a playable voice message.',
        params: [
            { name: 'chat_id', required: true, description: 'Unique identifier for the target chat or username of the target channel.' },
            { name: 'voice', required: true, description: 'Audio file to send. Pass a file_id, or a HTTP URL.' },
            { name: 'caption', description: 'Voice message caption, 0-1024 characters after entities parsing.' },
            { name: 'parse_mode', type: 'select', options: ['MarkdownV2', 'HTML', 'Markdown'], description: 'Mode for parsing entities in the voice message caption.' },
            { name: 'duration', type: 'number', description: 'Duration of the voice message in seconds.' },
            { name: 'disable_notification', type: 'boolean', description: 'Sends the message silently.' },
            { name: 'protect_content', type: 'boolean', description: 'Protects the contents of the sent message from forwarding and saving.' },
            { name: 'reply_to_message_id', type: 'number', description: 'If the message is a reply, ID of the original message.' },
            { name: 'reply_markup', type: 'json', description: 'Additional interface options.' }
        ]
    },
    sendVideoNote: {
        description: 'As of v.4.0, Telegram clients support rounded square mp4 videos of up to 1 minute long.',
        params: [
            { name: 'chat_id', required: true, description: 'Unique identifier for the target chat or username of the target channel.' },
            { name: 'video_note', required: true, description: 'Video note to send. Pass a file_id, or a HTTP URL.' },
            { name: 'duration', type: 'number', description: 'Duration of sent video in seconds.' },
            { name: 'length', type: 'number', description: 'Video width and height, i.e. diameter of the video message.' },
            { name: 'disable_notification', type: 'boolean', description: 'Sends the message silently.' },
            { name: 'protect_content', type: 'boolean', description: 'Protects the contents of the sent message from forwarding and saving.' },
            { name: 'reply_to_message_id', type: 'number', description: 'If the message is a reply, ID of the original message.' },
            { name: 'reply_markup', type: 'json', description: 'Additional interface options.' }
        ]
    },
    sendMediaGroup: {
        description: 'Send a group of photos, videos, documents or audios as an album.',
        params: [
            { name: 'chat_id', required: true, description: 'Unique identifier for the target chat or username of the target channel.' },
            { name: 'media', required: true, type: 'json', description: 'A JSON-serialized array describing messages to be sent, must include 2-10 items.' },
            { name: 'disable_notification', type: 'boolean', description: 'Sends messages silently.' },
            { name: 'protect_content', type: 'boolean', description: 'Protects the contents of the sent messages from forwarding and saving.' },
            { name: 'reply_to_message_id', type: 'number', description: 'If the messages are a reply, ID of the original message.' }
        ]
    },
    sendLocation: {
        description: 'Send point on the map.',
        params: [
            { name: 'chat_id', required: true, description: 'Unique identifier for the target chat or username of the target channel.' },
            { name: 'latitude', required: true, type: 'number', description: 'Latitude of the location.' },
            { name: 'longitude', required: true, type: 'number', description: 'Longitude of the location.' },
            { name: 'horizontal_accuracy', type: 'number', description: 'The radius of uncertainty for the location, measured in meters; 0-1500.' },
            { name: 'live_period', type: 'number', description: 'Period in seconds for which the location will be updated.' },
            { name: 'heading', type: 'number', description: 'For live locations, a direction in which the user is moving, in degrees.' },
            { name: 'proximity_alert_radius', type: 'number', description: 'For live locations, a maximum distance for proximity alerts about approaching another chat member, in meters.' },
            { name: 'disable_notification', type: 'boolean', description: 'Sends the message silently.' },
            { name: 'protect_content', type: 'boolean', description: 'Protects the contents of the sent message from forwarding and saving.' },
            { name: 'reply_to_message_id', type: 'number', description: 'If the message is a reply, ID of the original message.' },
            { name: 'reply_markup', type: 'json', description: 'Additional interface options.' }
        ]
    },
    editMessageText: {
        description: 'Edit text and game messages.',
        params: [
            { name: 'chat_id', description: 'Required if inline_message_id is not specified. Unique identifier for the target chat or username of the target channel.' },
            { name: 'message_id', type: 'number', description: 'Required if inline_message_id is not specified. Identifier of the message to edit.' },
            { name: 'inline_message_id', description: 'Required if chat_id and message_id are not specified. Identifier of the inline message.' },
            { name: 'text', required: true, type: 'textarea', description: 'New text of the message, 1-4096 characters after entities parsing.' },
            { name: 'parse_mode', type: 'select', options: ['MarkdownV2', 'HTML', 'Markdown'], description: 'Mode for parsing entities in the message text.' },
            { name: 'entities', type: 'json', description: 'A JSON-serialized list of special entities that appear in message text.' },
            { name: 'disable_web_page_preview', type: 'boolean', description: 'Disables link previews for links in this message.' },
            { name: 'reply_markup', type: 'json', description: 'Additional interface options.' }
        ]
    },
    editMessageCaption: {
        description: 'Edit captions of messages.',
        params: [
            { name: 'chat_id', description: 'Required if inline_message_id is not specified. Unique identifier for the target chat or username of the target channel.' },
            { name: 'message_id', type: 'number', description: 'Required if inline_message_id is not specified. Identifier of the message to edit.' },
            { name: 'inline_message_id', description: 'Required if chat_id and message_id are not specified. Identifier of the inline message.' },
            { name: 'caption', description: 'New caption of the message, 0-1024 characters after entities parsing.' },
            { name: 'parse_mode', type: 'select', options: ['MarkdownV2', 'HTML', 'Markdown'], description: 'Mode for parsing entities in the message caption.' },
            { name: 'caption_entities', type: 'json', description: 'A JSON-serialized list of special entities that appear in the caption.' },
            { name: 'reply_markup', type: 'json', description: 'Additional interface options.' }
        ]
    },
    deleteMessage: {
        description: 'Delete a message, including service messages, with the following limitations.',
        params: [
            { name: 'chat_id', required: true, description: 'Unique identifier for the target chat or username of the target channel.' },
            { name: 'message_id', required: true, type: 'number', description: 'Identifier of the message to delete.' }
        ]
    }
};
