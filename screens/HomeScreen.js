// screens/HomeScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Alert,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
  SafeAreaView,
  BackHandler,
  Vibration,
  Platform,
} from 'react-native';
import { auth, db } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Ionicons, 
  AntDesign 
} from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  // State declarations
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('feed');
  const [unreadCount, setUnreadCount] = useState(3);
  const [onlineUsers, setOnlineUsers] = useState(42);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;

  // Load user data and posts
  useEffect(() => {
    let unsubscribePosts = null;
    
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      console.log('Auth state changed:', user ? user.email : 'No user');
      setUser(user);
      if (user) {
        // Start animations immediately
        startAnimations();
        
        // Setup real-time listener for posts
        try {
          unsubscribePosts = setupRealTimeListeners();
        } catch (error) {
          console.error('Error setting up listeners:', error);
          setIsLoading(false);
          Alert.alert('Error', 'Failed to load posts');
        }
      } else {
        // No user, stop loading
        setIsLoading(false);
      }
    });

    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Back handler for Android
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => {
      if (unsubscribePosts) unsubscribePosts();
      unsubscribeAuth();
      clearInterval(timer);
      backHandler.remove();
    };
  }, []);

  // Filter posts based on search
  useEffect(() => {
    const filtered = posts.filter(post =>
      post.content && post.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredPosts(filtered);
  }, [searchQuery, posts]);

  const startAnimations = () => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Scale animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();

    // Rotation animation for loading
    Animated.loop(
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  const setupRealTimeListeners = () => {
    console.log('Setting up real-time listeners...');
    
    try {
      const q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const unsubscribePosts = onSnapshot(q, 
        (snapshot) => {
          console.log('Received posts snapshot with', snapshot.docs.length, 'documents');
          const postsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setPosts(postsData);
          setIsLoading(false);
          setRefreshing(false);
        },
        (error) => {
          console.error('Error in posts listener:', error);
          setIsLoading(false);
          setRefreshing(false);
          Alert.alert('Connection Error', 'Unable to load posts. Please check your connection.');
        }
      );

      return unsubscribePosts;
    } catch (error) {
      console.error('Error setting up query:', error);
      setIsLoading(false);
      setRefreshing(false);
      return null;
    }
  };

  const loadPosts = async () => {
    setRefreshing(true);
    // The real-time listener will handle the refresh
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            Vibration.vibrate(50);
            auth.signOut().then(() => navigation.replace('Login'));
          }
        }
      ]
    );
  };

  const handleBackPress = () => {
    if (profileMenuVisible) {
      setProfileMenuVisible(false);
      return true;
    }
    return false;
  };

  const addPost = async () => {
    if (newPost.trim() === '') return;

    try {
      setIsLoading(true);
      await addDoc(collection(db, 'posts'), {
        content: newPost,
        userId: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp(),
        likes: 0,
        comments: []
      });
      setNewPost('');
      setModalVisible(false);
      Vibration.vibrate(100);
    } catch (error) {
      console.error('Error adding post:', error);
      Alert.alert('Error', 'Failed to post message');
    } finally {
      setIsLoading(false);
    }
  };

  const likePost = async (postId) => {
    Vibration.vibrate(10);
    // TODO: Implement like functionality
  };

  const handleRefresh = () => {
    loadPosts();
    Vibration.vibrate(20);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    Vibration.vibrate(30);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const rotateInterpolate = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Feature Components
  const Header = () => (
    <View style={[styles.header, darkMode && styles.headerDark]}>
      <TouchableOpacity 
        style={styles.menuButton}
        onPress={() => setProfileMenuVisible(true)}
      >
        <Ionicons name="menu" size={24} color={darkMode ? '#fff' : '#000'} />
      </TouchableOpacity>
      
      <View style={styles.headerCenter}>
        <Text style={[styles.headerTitle, darkMode && styles.textWhite]}>
          Shay's Social
        </Text>
        <Text style={[styles.onlineStatus, darkMode && styles.textLight]}>
          {onlineUsers} online • {formatTime(currentTime)}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.notificationButton}
        onPress={() => setUnreadCount(0)}
      >
        <Ionicons name="notifications" size={24} color={darkMode ? '#fff' : '#000'} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const ProfileMenu = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={profileMenuVisible}
      onRequestClose={() => setProfileMenuVisible(false)}
    >
      <TouchableOpacity 
        style={styles.menuOverlay}
        activeOpacity={1}
        onPress={() => setProfileMenuVisible(false)}
      >
        <View style={[styles.menu, darkMode && styles.menuDark]}>
          <View style={styles.menuHeader}>
            <Text style={[styles.menuTitle, darkMode && styles.textWhite]}>
              Profile
            </Text>
            <TouchableOpacity onPress={() => setProfileMenuVisible(false)}>
              <Ionicons name="close" size={24} color={darkMode ? '#fff' : '#000'} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.menuItem}>
            <Ionicons name="person" size={20} color={darkMode ? '#fff' : '#000'} />
            <Text style={[styles.menuText, darkMode && styles.textWhite]}>
              {user?.email || 'Unknown User'}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="moon" size={20} color={darkMode ? '#fff' : '#000'} />
            <Text style={[styles.menuText, darkMode && styles.textWhite]}>
              Dark Mode
            </Text>
            <Switch value={darkMode} onValueChange={toggleDarkMode} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="notifications" size={20} color={darkMode ? '#fff' : '#000'} />
            <Text style={[styles.menuText, darkMode && styles.textWhite]}>
              Notifications
            </Text>
            <Switch value={notifications} onValueChange={setNotifications} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color="#ff3b30" />
            <Text style={styles.menuLogout}>Logout</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const SearchBar = () => (
    <View style={[styles.searchBar, darkMode && styles.searchBarDark]}>
      <Ionicons name="search" size={20} color={darkMode ? '#ccc' : '#666'} />
      <TextInput
        style={[styles.searchInput, darkMode && styles.searchInputDark]}
        placeholder="Search posts..."
        placeholderTextColor={darkMode ? '#ccc' : '#666'}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => setSearchQuery('')}>
          <Ionicons name="close-circle" size={20} color={darkMode ? '#ccc' : '#666'} />
        </TouchableOpacity>
      )}
    </View>
  );

  const NavigationTabs = () => (
    <View style={[styles.tabContainer, darkMode && styles.tabContainerDark]}>
      {['feed', 'messages', 'discover', 'profile'].map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tab,
            activeTab === tab && styles.activeTab,
            darkMode && activeTab === tab && styles.activeTabDark
          ]}
          onPress={() => setActiveTab(tab)}
        >
          <Text style={[
            styles.tabText,
            darkMode && styles.textWhite,
            activeTab === tab && styles.activeTabText
          ]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const PostCard = ({ post }) => (
    <Animated.View 
      style={[
        styles.postCard,
        darkMode && styles.postCardDark,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}
    >
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, darkMode && styles.avatarDark]}>
            <Text style={styles.avatarText}>
              {post.userEmail?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View>
            <Text style={[styles.userEmail, darkMode && styles.textWhite]}>
              {post.userEmail || 'Unknown User'}
            </Text>
            <Text style={[styles.postTime, darkMode && styles.textLight]}>
              {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'Recent'}
            </Text>
          </View>
        </View>
      </View>
      
      <Text style={[styles.postContent, darkMode && styles.textWhite]}>
        {post.content || 'No content'}
      </Text>
      
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => likePost(post.id)}>
          <AntDesign name="hearto" size={16} color={darkMode ? '#ccc' : '#666'} />
          <Text style={[styles.actionText, darkMode && styles.textLight]}>{post.likes || 0}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={16} color={darkMode ? '#ccc' : '#666'} />
          <Text style={[styles.actionText, darkMode && styles.textLight]}>{post.comments?.length || 0}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const FloatingActionButton = () => (
    <TouchableOpacity 
      style={[styles.fab, darkMode && styles.fabDark]}
      onPress={() => setModalVisible(true)}
    >
      <Ionicons name="add" size={24} color={darkMode ? '#000' : '#fff'} />
    </TouchableOpacity>
  );

  const NewPostModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, darkMode && styles.modalDark]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, darkMode && styles.textWhite]}>
              Create Post
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={darkMode ? '#fff' : '#000'} />
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={[styles.postInput, darkMode && styles.postInputDark]}
            multiline
            placeholder="What's on your mind?"
            placeholderTextColor={darkMode ? '#ccc' : '#666'}
            value={newPost}
            onChangeText={setNewPost}
            maxLength={280}
          />
          
          <Text style={[styles.charCount, darkMode && styles.textLight]}>
            {newPost.length}/280
          </Text>
          
          <TouchableOpacity 
            style={[styles.postButton, (!newPost.trim() || isLoading) && styles.postButtonDisabled]}
            onPress={addPost}
            disabled={!newPost.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, darkMode && styles.loadingContainerDark]}>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons name="infinite" size={64} color={darkMode ? '#fff' : '#000'} />
        </Animated.View>
        <Text style={[styles.loadingText, darkMode && styles.textWhite]}>
          Loading your universe...
        </Text>
        <TouchableOpacity 
          style={[styles.retryButton, darkMode && styles.retryButtonDark]}
          onPress={() => setIsLoading(false)}
        >
          <Text style={[styles.retryButtonText, darkMode && styles.textWhite]}>
            Skip Loading
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
      <StatusBar 
        barStyle={darkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={darkMode ? '#000' : '#fff'}
      />
      
      <Header />
      <SearchBar />
      <NavigationTabs />
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#000']}
            tintColor={darkMode ? '#fff' : '#000'}
          />
        }
      >
        {filteredPosts.length === 0 && posts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={darkMode ? '#666' : '#ccc'} />
            <Text style={[styles.emptyText, darkMode && styles.textLight]}>
              {searchQuery ? 'No posts found' : 'No posts yet. Be the first to post!'}
            </Text>
            <TouchableOpacity 
              style={[styles.firstPostButton, darkMode && styles.firstPostButtonDark]}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.firstPostButtonText}>Create First Post</Text>
            </TouchableOpacity>
          </View>
        ) : filteredPosts.length === 0 && searchQuery ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color={darkMode ? '#666' : '#ccc'} />
            <Text style={[styles.emptyText, darkMode && styles.textLight]}>
              No posts found for "{searchQuery}"
            </Text>
          </View>
        ) : (
          filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))
        )}
      </ScrollView>
      
      <FloatingActionButton />
      <ProfileMenu />
      <NewPostModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  containerDark: {
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerDark: {
    backgroundColor: '#111',
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  headerCenter: {
    alignItems: 'center',
  },
  onlineStatus: {
    fontSize: 12,
    color: '#666',
  },
  textWhite: {
    color: '#ffffff',
  },
  textLight: {
    color: '#cccccc',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menu: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: height * 0.4,
  },
  menuDark: {
    backgroundColor: '#111',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#000',
  },
  menuLogout: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#ff3b30',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    margin: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    height: 40,
  },
  searchBarDark: {
    backgroundColor: '#333',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: '#000',
  },
  searchInputDark: {
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabContainerDark: {
    backgroundColor: '#111',
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  activeTabDark: {
    borderBottomColor: '#fff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#000',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  postCard: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postCardDark: {
    backgroundColor: '#1a1a1a',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarDark: {
    backgroundColor: '#333',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  postTime: {
    fontSize: 12,
    color: '#666',
  },
  postContent: {
    fontSize: 16,
    lineHeight: 22,
    color: '#000',
    marginBottom: 10,
  },
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabDark: {
    backgroundColor: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    width: width * 0.9,
    borderRadius: 12,
    padding: 20,
  },
  modalDark: {
    backgroundColor: '#1a1a1a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  postInput: {
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#000',
    marginBottom: 10,
  },
  postInputDark: {
    borderColor: '#333',
    color: '#fff',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
    textAlign: 'right',
  },
  postButton: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#666',
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainerDark: {
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#000',
    borderRadius: 5,
  },
  retryButtonDark: {
    backgroundColor: '#fff',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  firstPostButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  firstPostButtonDark: {
    backgroundColor: '#fff',
  },
  firstPostButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuButton: {
    padding: 5,
  },
  notificationButton: {
    padding: 5,
    position: 'relative',
  },
});