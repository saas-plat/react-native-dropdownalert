
import React, { Component, PropTypes } from 'react'
import {
  View, Text, StyleSheet,
  TouchableHighlight, Animated, StatusBar,
  Platform, Dimensions, Image, PanResponder
} from "react-native"

// Constants
// Sizes
const DEFAULT_IMAGE_DIMENSIONS = 36
const WINDOW = Dimensions.get('window')
// Colors
const MAIN_INFO_COLOR = '#2B73B6'
const MAIN_WARN_COLOR = '#cd853f'
const MAIN_ERROR_COLOR = '#cc3232'
const MAIN_SUCCESS_COLOR = '#32A54A'

var closeTimeoutId = null
var panResponder

const ImageURISourcePropType = PropTypes.shape({
  /**
   * `uri` is a string representing the resource identifier for the image, which
   * could be an http address, a local file path, or the name of a static image
   * resource (which should be wrapped in the `require('./path/to/image.png')`
   * function).
   */
  uri: PropTypes.string,
  /**
   * `bundle` is the iOS asset bundle which the image is included in. This
   * will default to [NSBundle mainBundle] if not set.
   * @platform ios
   */
  bundle: PropTypes.string,
  /**
   * `method` is the HTTP Method to use. Defaults to GET if not specified.
   */
  method: PropTypes.string,
  /**
   * `headers` is an object representing the HTTP headers to send along with the
   * request for a remote image.
   */
  headers: PropTypes.objectOf(PropTypes.string),
  /**
   * `body` is the HTTP body to send with the request. This must be a valid
   * UTF-8 string, and will be sent exactly as specified, with no
   * additional encoding (e.g. URL-escaping or base64) applied.
   */
  body: PropTypes.string,
  /**
   * `cache` determines how the requests handles potentially cached
   * responses.
   *
   * - `default`: Use the native platforms default strategy. `useProtocolCachePolicy` on iOS.
   *
   * - `reload`: The data for the URL will be loaded from the originating source.
   * No existing cache data should be used to satisfy a URL load request.
   *
   * - `force-cache`: The existing cached data will be used to satisfy the request,
   * regardless of its age or expiration date. If there is no existing data in the cache
   * corresponding the request, the data is loaded from the originating source.
   *
   * - `only-if-cached`: The existing cache data will be used to satisfy a request, regardless of
   * its age or expiration date. If there is no existing data in the cache corresponding
   * to a URL load request, no attempt is made to load the data from the originating source,
   * and the load is considered to have failed.
   *
   * @platform ios
   */
  cache: PropTypes.oneOf([
    'default',
    'reload',
    'force-cache',
    'only-if-cached',
  ]),
  /**
   * `width` and `height` can be specified if known at build time, in which case
   * these will be used to set the default `<Image/>` component dimensions.
   */
  width: PropTypes.number,
  height: PropTypes.number,
  /**
   * `scale` is used to indicate the scale factor of the image. Defaults to 1.0 if
   * unspecified, meaning that one image pixel equates to one display point / DIP.
   */
  scale: PropTypes.number,
})

export default class DropdownAlert extends Component {
  static propTypes = {
    imageSrc: PropTypes.oneOfType([
      ImageURISourcePropType,
      PropTypes.string,
      PropTypes.number
    ]),
    cancelBtnImageSrc: PropTypes.oneOfType([
      ImageURISourcePropType,
      PropTypes.string,
      PropTypes.number
    ]),
    closeInterval: PropTypes.number,
    startDelta: PropTypes.number,
    endDelta: PropTypes.number,
    containerStyle: View.propTypes.style,
    titleStyle: Text.propTypes.style,
    messageStyle: Text.propTypes.style,
    imageStyle: Image.propTypes.style,
    cancelBtnImageStyle: Image.propTypes.style,
    titleNumOfLines: PropTypes.number,
    messageNumOfLines: PropTypes.number,
    onClose: PropTypes.func,
    onCancel: PropTypes.func,
    showCancel: PropTypes.bool,
    tapToCloseEnabled: PropTypes.bool,
    panResponderEnabled: PropTypes.bool,
    replaceEnabled: PropTypes.bool
  }
  static defaultProps =  {
    onClose: null,
    onCancel: null,
    closeInterval: 4000,
    startDelta: -100,
    endDelta: 0,
    titleNumOfLines: 1,
    messageNumOfLines: 3,
    imageSrc: null,
    cancelBtnImageSrc: require('./assets/cancel.png'),
    showCancel: false,
    tapToCloseEnabled: true,
    panResponderEnabled: true,
    replaceEnabled: true,
    containerStyle: {
      padding: 16,
      flexDirection: 'row'
    },
    titleStyle: {
      fontSize: 16,
      textAlign: 'left',
      fontWeight: 'bold',
      color: 'white',
      backgroundColor: 'transparent'
    },
    messageStyle: {
      fontSize: 14,
      textAlign: 'left',
      fontWeight: 'normal',
      color: 'white',
      backgroundColor: 'transparent'
    },
    imageStyle: {
      padding: 8,
      width: DEFAULT_IMAGE_DIMENSIONS,
      height: DEFAULT_IMAGE_DIMENSIONS,
      alignSelf: 'center'
    },
    cancelBtnImageStyle: {
      padding: 8,
      width: DEFAULT_IMAGE_DIMENSIONS,
      height: DEFAULT_IMAGE_DIMENSIONS,
      alignSelf: 'center'
    }
  }
  constructor(props) {
    super(props)
    this.state = {
      animationValue: new Animated.Value(0),
      duration: 450,
      type: '',
      message: '',
      title: '',
      isOpen: false,
      startDelta: props.startDelta,
      endDelta: props.endDelta,
      topValue: 0
    }
    // Render
    this.renderButton = this.renderButton.bind(this)
    this.renderDropDown = this.renderDropDown.bind(this)
    // Action
    this.alert = this.alert.bind(this)
    this.alertWithType = this.alertWithType.bind(this)
    this.dismiss = this.dismiss.bind(this)
    this.onCancel = this.onCancel.bind(this)
    this.onClose = this.onClose.bind(this)
    // Util
    this.animate = this.animate.bind(this)
    // Pan Responder
    this.handlePanResponderMove = this.handlePanResponderMove.bind(this)
    this.handlePanResponderEnd = this.handlePanResponderEnd.bind(this)
    this.handleMoveShouldSetPanResponder = this.handleMoveShouldSetPanResponder.bind(this)
    this.handleStartShouldSetPanResponder = this.handleMoveShouldSetPanResponder.bind(this)
  }
  componentWillMount() {
    panResponder = PanResponder.create({
      onStartShouldSetPanResponder: this.handleStartShouldSetPanResponder,
      onMoveShouldSetPanResponder: this.handleMoveShouldSetPanResponder,
      onPanResponderMove: this.handlePanResponderMove,
      onPanResponderRelease: this.handlePanResponderEnd,
      onPanResponderTerminate: this.handlePanResponderEnd,
    })
  }
  alert(title, message) {
    if (title == undefined) {
      title = null
    }
    if (message == undefined) {
      message = null
    }
    this.alertWithType('custom', title, message)
  }
  alertWithType(type, title, message) {
    if (this.validateType(type) == false) {
      return
    }
    if (typeof title !== 'string') {
      title = title.toString()
      console.warn('DropdownAlert: Title is not a string.')
    }
    if (typeof message !== 'string') {
      message = message.toString()
      console.warn('DropdownAlert: Message is not a string.')
    }
    if (this.props.replaceEnabled == false) {
      this.setState({
        type: type,
        message: message,
        title: title,
        isOpen: true,
        topValue: 0
      })
      if (this.state.isOpen == false) {
        this.animate(1)
      }
      if (this.props.closeInterval > 1) {
        if (closeTimeoutId != null) {
          clearTimeout(closeTimeoutId)
       }
       closeTimeoutId = setTimeout(function() {
         this.onClose()
       }.bind(this), this.props.closeInterval)
     }
   } else {
     var delayInMilliSeconds = 0
     if (this.state.isOpen == true) {
       delayInMilliSeconds = 475
       this.dismiss()
     }
      var self = this
      setTimeout(function() {
        if (self.state.isOpen == false) {
          self.setState({
            type: type,
            message: message,
            title: title,
            isOpen: true,
            topValue: 0
          })
        }
        self.animate(1)
        if (self.props.closeInterval > 1) {
         closeTimeoutId = setTimeout(function() {
           self.onClose()
         }.bind(self), self.props.closeInterval)
       }
      }.bind(this), delayInMilliSeconds)
   }
  }
  dismiss(onDismiss) {
    if (this.state.isOpen) {
      if (closeTimeoutId != null) {
        clearTimeout(closeTimeoutId)
      }
      this.animate(0)
      setTimeout(function() {
        if (this.state.isOpen) {
          this.state.isOpen = false
          if (onDismiss) {
            var data = {
              type: this.state.type,
              title: this.state.title,
              message: this.state.message
            }
            onDismiss(data)
          }
        }
      }.bind(this), (this.state.duration))
    }
  }
  onClose() {
    this.dismiss(this.props.onClose)
  }
  onCancel() {
    this.dismiss(this.props.onCancel)
  }
  animate(toValue) {
    Animated.spring (
      this.state.animationValue, {
        toValue: toValue,
        duration: this.state.duration,
        friction: 9
      }
    ).start()
  }
  onLayoutEvent(event) {
    var {x, y, width, height} = event.nativeEvent.layout
    var actualStartDelta = this.state.startDelta
    var actualEndDelta = this.state.endDelta
    // Prevent it from going off screen.
    if (this.props.startDelta < 0) {
      var delta = 0 - height
      if (delta != this.props.startDelta) {
        actualStartDelta = delta
      }
    } else if (this.props.startDelta > WINDOW.height) {
      actualStartDelta = WINDOW.height + height
    }
    if (this.props.endDelta < 0) {
      actualEndDelta = 0
    } else if (this.props.endDelta > WINDOW.height) {
      actualEndDelta = WINDOW.height - height
    }
    var heightDelta = WINDOW.height - this.props.endDelta - height
    if (heightDelta < 0) {
      actualEndDelta = this.props.endDelta + heightDelta
    }
    if (actualStartDelta != this.state.startDelta || actualEndDelta != this.state.endDelta) {
      this.setState({
        startDelta: actualStartDelta,
        endDelta: actualEndDelta
      })
    }
  }
  validateType(type) {
    if (type.length === 0 || type === null) {
      console.warn('Missing DropdownAlert type. Available types: info, warn, error or custom')
      return false
    }
    if (type != 'info' && type != 'warn' && type != 'error' && type != 'custom' && type != 'success') {
      console.warn('Invalid DropdownAlert type. Available types: info, warn, error, success, or custom')
      return false
    }
    return true
  }
  handleStartShouldSetPanResponder(e: Object, gestureState: Object): boolean {
    return this.props.panResponderEnabled
  }
  handleMoveShouldSetPanResponder(e: Object, gestureState: Object): boolean {
    return gestureState.dx !== 0 && gestureState.dy !== 0 && this.props.panResponderEnabled
  }
  handlePanResponderMove(e: Object, gestureState: Object) {
    if (gestureState.dy < 0) {
      this.setState({
        topValue: gestureState.dy
      })
    }
  }
  handlePanResponderEnd(e: Object, gestureState: Object) {
    const delta = this.state.startDelta / 5
    if (gestureState.dy < delta) {
      this.dismiss(this.props.onClose)
    }
  }
  renderText(text, style, numberOfLines) {
    if (text != null) {
      if (text.length > 0) {
        return (
          <Text style={style} numberOfLines={numberOfLines}>{text}</Text>
        )
      }
    }
    return null
  }
  renderImage(source, style) {
    if (source != null) {
      if (typeof source === 'object' || typeof source === 'number') {
        return (
          <Image style={style} source={source} />
        )
      } else if (typeof source === 'string') {
        if (style['width'] == false) {
          style['width'] = DEFAULT_IMAGE_DIMENSIONS
        }
        if (style['height'] == false) {
          style['height'] = DEFAULT_IMAGE_DIMENSIONS
        }
        return (
          <Image style={style} source={{uri: source}} />
        )
      }
    }
    return null
  }
  renderStatusBar(type, backgroundColor) {
    if (Platform.OS === 'android') {
      return (
        <StatusBar backgroundColor={backgroundColor} />
      )
    } else if (type != 'custom') {
      return (
        <StatusBar barStyle="light-content" />
      )
    }
    return null
  }
  renderButton(source, style, onPress, underlayColor, isRendered) {
    if (source != null && isRendered) {
      return (
        <TouchableHighlight style={{alignSelf: style.alignSelf, width: style.width, height: style.height}} onPress={onPress} underlayColor={underlayColor}>
          {this.renderImage(source, style)}
        </TouchableHighlight>
      )
    }
    return null
  }
  renderDropDown(isOpen) {
    if (isOpen == true) {
      var style = [styles.defaultContainer, this.props.containerStyle]
      var source = this.props.imageSrc
      var backgroundColor = this.props.containerStyle.backgroundColor
      switch (this.state.type) {
        case 'info':
          style = [styles.defaultContainer, {backgroundColor: MAIN_INFO_COLOR}]
          source = require('./assets/info.png')
          backgroundColor = MAIN_INFO_COLOR
          break;
        case 'warn':
          style = [styles.defaultContainer, {backgroundColor: MAIN_WARN_COLOR}]
          source = require('./assets/warn.png')
          backgroundColor = MAIN_WARN_COLOR
          break;
        case 'error':
          style = [styles.defaultContainer, {backgroundColor: MAIN_ERROR_COLOR}]
          source = require('./assets/error.png')
          backgroundColor = MAIN_ERROR_COLOR
          break;
        case 'success':
          style = [styles.defaultContainer, {backgroundColor: MAIN_SUCCESS_COLOR}]
          source = require('./assets/success.png')
          backgroundColor = MAIN_SUCCESS_COLOR
          break;
      }
      return (
          <Animated.View
           ref={(ref) => this.mainView = ref}
           {...panResponder.panHandlers}
           style={{
              transform: [{
                translateY: this.state.animationValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [this.state.startDelta, this.state.endDelta]
                }),
              }],
              position: 'absolute',
              top: this.state.topValue,
              left: 0,
              right: 0
            }}>
            {this.renderStatusBar(this.state.type, backgroundColor)}
            <TouchableHighlight
                onPress={(this.props.showCancel) ? null : this.onClose}
                underlayColor={backgroundColor}
                disabled={!this.props.tapToCloseEnabled}
                onLayout={(event) => this.onLayoutEvent(event)}>
              <View style={style}>
                {this.renderImage(source, this.props.imageStyle)}
                <View style={styles.textContainer}>
                  {this.renderText(this.state.title, this.props.titleStyle, this.props.titleNumOfLines)}
                  {this.renderText(this.state.message, this.props.messageStyle, this.props.messageNumOfLines)}
                </View>
                {this.renderButton(this.props.cancelBtnImageSrc, this.props.cancelBtnImageStyle, this.onCancel, backgroundColor, this.props.showCancel)}
              </View>
            </TouchableHighlight>
          </Animated.View>
      )
    }
    return null
  }
  render() {
    return (
      this.renderDropDown(this.state.isOpen)
    )
  }
}

var styles = StyleSheet.create({
  defaultContainer: {
    padding: 8,
    paddingTop: (Platform.OS === 'android') ? 0 : 20,
    flexDirection: 'row'
  },
  textContainer: {
    flex: 1,
    padding: 8
  }
})
